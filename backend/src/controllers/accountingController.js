import mongoose from "mongoose";
import Account from "../models/Account.js";
import JournalEntry from "../models/JournalEntry.js";
import AuditLog from "../models/AuditLog.js";
import Expense from "../models/Expense.js";
import CashSession from "../models/CashSession.js";
import { runFinancialTransaction } from "../services/financialTransactions.js";
import { createLedgerTransaction } from "../services/financialTransactions.js";
import { configuredAccount, postJournal } from "../services/ledgerPosting.js";
import { validateBalancedJournalLines } from "../services/accountingService.js";
import { generateReference } from "../utils/generateReference.js";

function operationalError(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

export async function listAccounts(request, response) {
	const filter = {};
	if (request.query.category) {
		if (!["asset", "liability", "equity", "income", "expense"].includes(request.query.category)) return response.status(400).json({ message: "Account category is invalid." });
		filter.category = request.query.category;
	}
	if (request.query.active !== undefined) filter.isActive = request.query.active !== "false";
	try {
		const accounts = await Account.find(filter).sort({ code: 1 }).lean();
		return response.json({ accounts });
	} catch (error) {
		console.error("Unable to list chart of accounts:", error.message);
		return response.status(500).json({ message: "Chart of accounts could not be loaded." });
	}
}

export async function createAccount(request, response) {
	const body = request.body ?? {};
	const categories = ["asset", "liability", "equity", "income", "expense"];
	if (typeof body.code !== "string" || !/^[A-Z0-9][A-Z0-9._-]{1,23}$/i.test(body.code.trim())) return response.status(400).json({ message: "Account code must be 2–24 letters, digits, dots, underscores, or hyphens." });
	if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) return response.status(400).json({ message: "Account name is required (up to 120 characters)." });
	if (!categories.includes(body.category)) return response.status(400).json({ message: "Account category is invalid." });
	const normalBalance = body.normalBalance || (["asset", "expense"].includes(body.category) ? "debit" : "credit");
	if (!["debit", "credit"].includes(normalBalance)) return response.status(400).json({ message: "Normal balance must be debit or credit." });
	const currency = typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB";
	const systemKeys = ["cash", "bank", "mobile_money", "savings", "loan_receivable", "interest_income", "fees_income", "expense"];
	if (body.systemKey && (!systemKeys.includes(body.systemKey) || request.adminUser.role !== "admin")) return response.status(403).json({ message: "Only administrators can assign a supported system posting key." });
	if (body.parent && !mongoose.isValidObjectId(body.parent)) return response.status(400).json({ message: "Parent account ID is invalid." });
	try {
		const account = await runFinancialTransaction(async (session) => {
			if (body.parent) {
				const parent = await Account.findOne({ _id: body.parent, isActive: true, currency }).session(session);
				if (!parent) throw operationalError(400, "Parent account must exist, be active, and use the same currency.");
			}
			const [created] = await Account.create([{
				code: body.code.trim().toUpperCase(),
				name: body.name.trim(),
				description: typeof body.description === "string" ? body.description.trim().slice(0, 500) : "",
				category: body.category,
				normalBalance,
				currency,
				parent: body.parent || null,
				systemKey: body.systemKey || undefined,
				isSystem: Boolean(body.systemKey),
				isActive: true,
				createdBy: request.adminUser._id,
				updatedBy: request.adminUser._id,
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "accounting.account.created",
				resourceType: "Account",
				resourceId: created._id,
				outcome: "success",
				details: { code: created.code, category: created.category, systemKey: created.systemKey || null },
			}], { session });
			return created;
		});
		return response.status(201).json({ message: "Account created.", account });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Account could not be created." });
	}
}

export async function createJournal(request, response) {
	const body = request.body ?? {};
	if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 500) return response.status(400).json({ message: "A description of up to 500 characters is required." });
	if (!Array.isArray(body.lines) || body.lines.length < 2 || body.lines.length > 100) return response.status(400).json({ message: "A journal requires between 2 and 100 lines." });
	const currency = typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB";
	try {
		validateBalancedJournalLines(body.lines);
	} catch (error) {
		return response.status(400).json({ message: error.message });
	}

	try {
		const entry = await runFinancialTransaction(async (session) => {
			const accountIds = [...new Set(body.lines.map((line) => String(line.account)))];
			if (accountIds.some((id) => !mongoose.isValidObjectId(id))) {
				const error = new Error("Each journal line must reference a valid, distinct account.");
				error.status = 400;
				throw error;
			}
			const accounts = await Account.find({ _id: { $in: accountIds }, isActive: true, currency }).session(session).lean();
			if (accounts.length !== accountIds.length) {
				const error = new Error("Every journal account must exist, be active, and use the same currency.");
				error.status = 400;
				throw error;
			}
			const lines = body.lines.map((line) => ({
				account: line.account,
				description: typeof line.description === "string" ? line.description.slice(0, 250) : "",
				debitMinor: Number(line.debitMinor || 0),
				creditMinor: Number(line.creditMinor || 0),
				member: line.member && mongoose.isValidObjectId(line.member) ? line.member : null,
				loan: line.loan && mongoose.isValidObjectId(line.loan) ? line.loan : null,
			}));
			const [journal] = await JournalEntry.create([{
				entryNumber: generateReference("JE"),
				date: body.date && !Number.isNaN(Date.parse(body.date)) ? new Date(body.date) : new Date(),
				description: body.description.trim(),
				currency,
				lines,
				status: "posted",
				sourceType: "manual",
				createdBy: request.adminUser._id,
				postedBy: request.adminUser._id,
				postedAt: new Date(),
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "accounting.journal.posted",
				resourceType: "JournalEntry",
				resourceId: journal._id,
				outcome: "success",
				details: { entryNumber: journal.entryNumber, lineCount: lines.length, currency },
			}], { session });
			return journal;
		});
		return response.status(201).json({ message: "Balanced journal posted.", journal: entry });
	} catch (error) {
		console.error("Unable to create journal:", error.message);
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Journal could not be posted." });
	}
}

export async function createExpense(request, response) {
	const body = request.body ?? {};
	const amountMinor = Number(body.amountMinor);
	if (typeof body.category !== "string" || !body.category.trim() || body.category.length > 80) return response.status(400).json({ message: "Expense category is required (up to 80 characters)." });
	if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 1000) return response.status(400).json({ message: "Expense description is required (up to 1000 characters)." });
	if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return response.status(400).json({ message: "Expense amount must be a positive integer in minor units." });
	if (!["cash", "bank_transfer", "mobile_money", "other"].includes(body.paymentMethod)) return response.status(400).json({ message: "Expense payment method is invalid." });
	try {
		const expense = await runFinancialTransaction(async (session) => {
			const [created] = await Expense.create([{
				expenseNumber: generateReference("EXP"),
				category: body.category.trim(),
				description: body.description.trim(),
				amountMinor,
				currency: typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB",
				incurredAt: body.incurredAt && !Number.isNaN(Date.parse(body.incurredAt)) ? new Date(body.incurredAt) : new Date(),
				vendorName: typeof body.vendorName === "string" ? body.vendorName.trim().slice(0, 160) : "",
				vendorReference: typeof body.vendorReference === "string" ? body.vendorReference.trim().slice(0, 100) : "",
				paymentMethod: body.paymentMethod,
				status: "submitted",
				requestedBy: request.adminUser._id,
				notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "",
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "expense.submitted",
				resourceType: "Expense",
				resourceId: created._id,
				outcome: "success",
				details: { expenseNumber: created.expenseNumber, amountMinor, currency: created.currency },
			}], { session });
			return created;
		});
		return response.status(201).json({ message: "Expense submitted for approval.", expense });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Expense could not be created." });
	}
}

export async function listExpenses(request, response) {
	const filter = {};
	if (request.query.status) {
		if (!["draft", "submitted", "approved", "rejected", "paid", "void"].includes(request.query.status)) return response.status(400).json({ message: "Expense status is invalid." });
		filter.status = request.query.status;
	}
	const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100);
	try {
		const expenses = await Expense.find(filter).sort({ createdAt: -1 }).limit(limit).populate("requestedBy approvedBy paidBy", "name email").lean();
		return response.json({ expenses });
	} catch (error) {
		return response.status(500).json({ message: "Expenses could not be loaded." });
	}
}

export async function decideExpense(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Expense ID is invalid." });
	const decision = request.body?.decision;
	const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
	if (!["approved", "rejected"].includes(decision)) return response.status(400).json({ message: "Decision must be approved or rejected." });
	if (decision === "rejected" && !reason) return response.status(400).json({ message: "A rejection reason is required." });
	try {
		const expense = await runFinancialTransaction(async (session) => {
			const current = await Expense.findById(request.params.id).session(session);
			if (!current) throw operationalError(404, "Expense was not found.");
			if (current.status !== "submitted") throw operationalError(409, "Only submitted expenses can receive a decision.");
			if (decision === "approved" && current.requestedBy.equals(request.adminUser._id)) throw operationalError(403, "The expense requester cannot approve their own expense.");
			current.status = decision;
			current.approvedBy = decision === "approved" ? request.adminUser._id : null;
			current.approvedAt = decision === "approved" ? new Date() : null;
			if (decision === "rejected") current.notes = [current.notes, `Rejected: ${reason}`].filter(Boolean).join(" ").slice(0, 1000);
			await current.save({ session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: `expense.${decision}`,
				resourceType: "Expense",
				resourceId: current._id,
				outcome: "success",
				details: { expenseNumber: current.expenseNumber, reason },
			}], { session });
			return current;
		});
		return response.json({ message: `Expense ${decision}.`, expense });
	} catch (error) {
		return response.status(error.status || 500).json({ message: error.message || "Expense decision could not be saved." });
	}
}

export async function payExpense(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Expense ID is invalid." });
	try {
		const result = await runFinancialTransaction(async (session) => {
			const expense = await Expense.findById(request.params.id).session(session);
			if (!expense) throw operationalError(404, "Expense was not found.");
			if (expense.status !== "approved") throw operationalError(409, "Only approved expenses can be paid.");
			const settlementCode = expense.paymentMethod === "cash" ? "cash" : expense.paymentMethod === "mobile_money" ? "mobile_money" : "bank";
			const settlement = await configuredAccount(settlementCode, expense.currency, session);
			const expenseAccount = expense.account
				? await Account.findOne({ _id: expense.account, isActive: true, currency: expense.currency }).session(session)
				: await configuredAccount("expense", expense.currency, session);
			if (!expenseAccount) throw operationalError(503, "Expense account is missing or inactive.");
			let cashSession = null;
			if (expense.paymentMethod === "cash") {
				cashSession = await CashSession.findOne({ cashier: request.adminUser._id, status: "open" }).session(session);
				if (!cashSession) throw operationalError(409, "An open cashier session is required for cash expense payment.");
			}
			const transaction = await createLedgerTransaction({
				session,
				actor: request.adminUser,
				reference: generateReference("TXN"),
				type: "expense",
				direction: "debit",
				amountMinor: expense.amountMinor,
				currency: expense.currency,
				paymentMethod: expense.paymentMethod,
				cashSession: cashSession?._id,
				description: `Expense ${expense.expenseNumber}: ${expense.description}`,
			});
			const [journalEntry] = await JournalEntry.create([{
				entryNumber: generateReference("JE"),
				date: new Date(),
				description: transaction.description,
				currency: expense.currency,
				lines: [
					{ account: expenseAccount._id, debitMinor: expense.amountMinor, creditMinor: 0, description: expense.description },
					{ account: settlement._id, debitMinor: 0, creditMinor: expense.amountMinor, description: "Expense payment" },
				],
				status: "posted",
				sourceType: "expense",
				sourceId: expense._id,
				createdBy: request.adminUser._id,
				postedBy: request.adminUser._id,
				postedAt: new Date(),
			}], { session });
			transaction.metadata = { journalEntry: journalEntry._id, expense: expense._id };
			await transaction.save({ session });
			expense.status = "paid";
			expense.paidBy = request.adminUser._id;
			expense.paidAt = new Date();
			expense.journalEntry = journalEntry._id;
			await expense.save({ session });
			if (cashSession) {
				cashSession.movements.push({ transaction: transaction._id, type: "cash_out", amountMinor: expense.amountMinor, reference: transaction.reference, note: transaction.description });
				cashSession.expectedClosingMinor = cashSession.openingFloatMinor + cashSession.movements.reduce((total, movement) => total + (movement.type === "cash_in" ? movement.amountMinor : movement.type === "cash_out" ? -movement.amountMinor : 0), 0);
				await cashSession.save({ session });
			}
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "expense.paid",
				resourceType: "Expense",
				resourceId: expense._id,
				outcome: "success",
				details: { transaction: transaction._id, journalEntry: journalEntry._id, amountMinor: expense.amountMinor },
			}], { session });
			return { expense, transaction, journalEntry };
		});
		return response.json({ message: "Expense paid and posted.", ...result });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Expense could not be paid." });
	}
}