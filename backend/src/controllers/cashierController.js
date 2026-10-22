import mongoose from "mongoose";
import CashSession from "../models/CashSession.js";
import Transaction from "../models/Transaction.js";
import AuditLog from "../models/AuditLog.js";
import { runFinancialTransaction } from "../services/financialTransactions.js";
import { generateReference } from "../utils/generateReference.js";

export async function openCashSession(request, response) {
	const openingFloatMinor = Number(request.body?.openingFloatMinor);
	const currency = typeof request.body?.currency === "string" && /^[A-Z]{3}$/i.test(request.body.currency) ? request.body.currency.toUpperCase() : "ETB";
	const branchCode = typeof request.body?.branchCode === "string" && request.body.branchCode.trim() ? request.body.branchCode.trim().toUpperCase() : "MAIN";
	if (!Number.isSafeInteger(openingFloatMinor) || openingFloatMinor < 0) return response.status(400).json({ message: "Opening float must be a non-negative integer in minor units." });
	if (branchCode.length > 32) return response.status(400).json({ message: "Branch code must be 32 characters or fewer." });
	try {
		const cashSession = await runFinancialTransaction(async (session) => {
			const existing = await CashSession.findOne({ cashier: request.adminUser._id, branchCode, status: "open" }).session(session);
			if (existing) {
				const error = new Error("You already have an open cash session at this branch.");
				error.status = 409;
				throw error;
			}
			const [created] = await CashSession.create([{
				sessionNumber: generateReference("CASH"),
				cashier: request.adminUser._id,
				branchCode,
				currency,
				openingFloatMinor,
				expectedClosingMinor: openingFloatMinor,
				openedAt: new Date(),
				status: "open",
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "cash_session.opened",
				resourceType: "CashSession",
				resourceId: created._id,
				outcome: "success",
				details: { sessionNumber: created.sessionNumber, openingFloatMinor, currency, branchCode },
			}], { session });
			return created;
		});
		return response.status(201).json({ message: "Cash session opened.", cashSession });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Cash session could not be opened." });
	}
}

export async function closeCashSession(request, response) {
	const sessionId = request.body?.sessionId;
	const countedClosingMinor = Number(request.body?.countedClosingMinor);
	const closingNotes = typeof request.body?.closingNotes === "string" ? request.body.closingNotes.trim() : "";
	if (!mongoose.isValidObjectId(sessionId)) return response.status(400).json({ message: "Cash session ID is invalid." });
	if (!Number.isSafeInteger(countedClosingMinor) || countedClosingMinor < 0) return response.status(400).json({ message: "Counted cash must be a non-negative integer in minor units." });
	if (closingNotes.length > 1000) return response.status(400).json({ message: "Closing notes must be 1000 characters or fewer." });
	try {
		const cashSession = await runFinancialTransaction(async (session) => {
			const current = await CashSession.findOne({ _id: sessionId, cashier: request.adminUser._id, status: "open" }).session(session);
			if (!current) {
				const error = new Error("Open cash session was not found for this cashier.");
				error.status = 404;
				throw error;
			}
			const postedTransactions = await Transaction.find({
				cashSession: current._id,
				status: "posted",
				direction: { $in: ["credit", "debit"] },
			}).session(session).lean();
			const countedCashFlow = postedTransactions.reduce((total, transaction) => total + (transaction.direction === "credit" ? transaction.amountMinor : -transaction.amountMinor), 0);
			const expectedClosingMinor = current.openingFloatMinor + countedCashFlow;
			current.expectedClosingMinor = expectedClosingMinor;
			current.countedClosingMinor = countedClosingMinor;
			current.varianceMinor = countedClosingMinor - expectedClosingMinor;
			current.closedAt = new Date();
			current.closedBy = request.adminUser._id;
			current.closingNotes = closingNotes;
			current.status = current.varianceMinor === 0 ? "closed" : "disputed";
			await current.save({ session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: current.status === "closed" ? "cash_session.closed" : "cash_session.disputed",
				resourceType: "CashSession",
				resourceId: current._id,
				outcome: "success",
				details: { expectedClosingMinor, countedClosingMinor, varianceMinor: current.varianceMinor, transactionCount: postedTransactions.length },
			}], { session });
			return current;
		});
		return response.json({ message: cashSession.varianceMinor === 0 ? "Cash session balanced and closed." : "Cash session closed with a variance; manager review is required.", cashSession });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Cash session could not be closed." });
	}
}

export async function getCurrentCashSession(request, response) {
	try {
		const cashSession = await CashSession.findOne({ cashier: request.adminUser._id, status: "open" }).sort({ openedAt: -1 }).lean();
		return response.json({ cashSession });
	} catch (error) {
		return response.status(500).json({ message: "Cash session could not be loaded." });
	}
}