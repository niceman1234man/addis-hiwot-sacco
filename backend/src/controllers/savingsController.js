import mongoose from "mongoose";
import Member from "../models/Member.js";
import SavingsAccount from "../models/SavingsAccount.js";
import CashSession from "../models/CashSession.js";
import AuditLog from "../models/AuditLog.js";
import { runFinancialTransaction, createLedgerTransaction } from "../services/financialTransactions.js";
import { configuredAccount, journalLinesForSavings, postJournal } from "../services/ledgerPosting.js";
import { previewSavingsBalance } from "../services/savingsService.js";
import { generateReference } from "../utils/generateReference.js";

const accountStatuses = ["active", "frozen", "closed"];
const paymentMethods = ["cash", "bank_transfer", "mobile_money"];

function objectId(value, label) {
	if (!mongoose.isValidObjectId(value)) {
		const error = new Error(`${label} must be a valid ID.`);
		error.status = 400;
		throw error;
	}
	return new mongoose.Types.ObjectId(value);
}

function amount(value) {
	if (!Number.isSafeInteger(value) || value <= 0) {
		const error = new Error("Amount must be a positive integer in minor currency units.");
		error.status = 400;
		throw error;
	}
	return value;
}

async function assertActiveMember(memberId, session) {
	const member = await Member.findOne({
		_id: memberId,
		$or: [{ status: "approved" }, { membershipStatus: "active" }],
	}).session(session);
	if (!member) {
		const error = new Error("An approved active member is required for a savings account.");
		error.status = 404;
		throw error;
	}
	return member;
}

async function openCashSessionFor(user, session) {
	const cashSession = await CashSession.findOne({ cashier: user._id, status: "open" }).session(session);
	if (!cashSession) {
		const error = new Error("Open a cashier cash session before processing a cash transaction.");
		error.status = 409;
		throw error;
	}
	return cashSession;
}

async function recordCashMovement(cashSession, transaction, amountMinor, type, session) {
	cashSession.movements.push({
		transaction: transaction._id,
		type,
		amountMinor,
		reference: transaction.reference,
		note: transaction.description,
	});
	cashSession.expectedClosingMinor = cashSession.openingFloatMinor + cashSession.movements.reduce(
		(total, movement) => total + (movement.type === "cash_in" ? movement.amountMinor : movement.type === "cash_out" ? -movement.amountMinor : 0),
		0,
	);
	await cashSession.save({ session });
}

export async function createSavingsAccount(request, response) {
	const { member: memberValue, productName, currency = "ETB" } = request.body ?? {};
	if (typeof productName !== "string" || !productName.trim()) return response.status(400).json({ message: "A savings product is required." });
	if (!/^[A-Z]{3}$/i.test(currency)) return response.status(400).json({ message: "Currency must be a three-letter code." });
	if (Number(request.body?.initialDepositMinor || 0) !== 0) return response.status(400).json({ message: "Create the account first; record its opening deposit through the deposit operation." });

	try {
		const account = await runFinancialTransaction(async (session) => {
			const memberId = objectId(memberValue, "Member ID");
			await assertActiveMember(memberId, session);
			const createdAt = new Date();
			const [created] = await SavingsAccount.create([{
				accountNumber: generateReference("SAV"),
				member: memberId,
				productName: productName.trim(),
				currency: currency.toUpperCase(),
				status: "active",
				openedAt: createdAt,
				openedBy: request.adminUser._id,
				createdBy: request.adminUser._id,
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "savings_account.opened",
				resourceType: "SavingsAccount",
				resourceId: created._id,
				outcome: "success",
				details: { accountNumber: created.accountNumber, member: memberId, currency: created.currency },
			}], { session });
			return created;
		});
		return response.status(201).json({ account });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Savings account could not be opened." });
	}
}

export async function listSavings(request, response) {
	const filter = {};
	if (request.query.member) {
		if (!mongoose.isValidObjectId(request.query.member)) return response.status(400).json({ message: "Member ID is invalid." });
		filter.member = request.query.member;
	}
	if (request.query.status) {
		if (!accountStatuses.includes(request.query.status)) return response.status(400).json({ message: "Account status is invalid." });
		filter.status = request.query.status;
	}
	const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100);
	try {
		if (request.query.search) {
			const escapedSearch = String(request.query.search).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const searchExpression = new RegExp(escapedSearch, "i");
			const matchingMembers = await Member.find({
				$or: [
					{ firstName: searchExpression },
					{ middleName: searchExpression },
					{ lastName: searchExpression },
					{ memberNumber: searchExpression },
				],
			}).select("_id").lean();
			filter.$or = [
				{ accountNumber: searchExpression },
				{ member: { $in: matchingMembers.map((member) => member._id) } },
			];
		}
		const accounts = await SavingsAccount.find(filter).sort({ createdAt: -1 }).limit(limit).populate("member", "firstName middleName lastName memberNumber").lean();
		return response.json({ accounts });
	} catch (error) {
		return response.status(500).json({ message: "Savings accounts could not be loaded." });
	}
}

export async function listEligibleMembers(_request, response) {
	try {
		const members = await Member.find({
			status: { $ne: "rejected" },
			membershipStatus: { $nin: ["rejected", "suspended", "exited"] },
		})
			.select("firstName middleName lastName memberNumber status membershipStatus")
			.sort({ lastName: 1, firstName: 1 })
			.lean();
		return response.json({ members: members.map((member) => ({
			id: String(member._id),
			firstName: member.firstName,
			middleName: member.middleName,
			lastName: member.lastName,
			memberNumber: member.memberNumber || "",
			status: member.membershipStatus === "active" || member.status === "approved" ? "active" : "pending",
			eligible: member.membershipStatus === "active" || member.status === "approved",
		})) });
	} catch (error) {
		console.error("Unable to load eligible savings members:", error.message);
		return response.status(500).json({ message: "Eligible members could not be loaded." });
	}
}

async function postSavingsMovement(request, response, direction) {
	const { savingsAccountId, memberId: memberValue, paymentMethod, description = "" } = request.body ?? {};
	if (!paymentMethods.includes(paymentMethod)) return response.status(400).json({ message: "Choose a supported payment method." });
	if (typeof description !== "string" || description.length > 500) return response.status(400).json({ message: "Description must be 500 characters or fewer." });
	if (direction === "debit" && request.body?.identityVerified !== true) return response.status(400).json({ message: "Confirm member identity verification before recording a withdrawal." });

	try {
		const amountMinor = amount(request.body.amountMinor);
		const result = await runFinancialTransaction(async (session) => {
			const accountId = objectId(savingsAccountId, "Savings account ID");
			const memberId = objectId(memberValue, "Member ID");
				  const account = await SavingsAccount.findOne({ _id: accountId, member: memberId, status: "active" }).session(session);
			if (!account) {
				const error = new Error("Active savings account was not found for this member.");
				error.status = 404;
				throw error;
			}
			const cashSession = paymentMethod === "cash" ? await openCashSessionFor(request.adminUser, session) : null;
			const balances = previewSavingsBalance(account, direction === "credit" ? "deposit" : "withdrawal", amountMinor);
			if (paymentMethod === "cash" && !cashSession) throw new Error("Open a cashier session first.");

			const settlement = await configuredAccount(paymentMethod === "cash" ? "cash" : paymentMethod === "mobile_money" ? "mobile_money" : "bank", account.currency, session);
			const savingsLiability = await configuredAccount("savings", account.currency, session);
			const reference = generateReference(direction === "credit" ? "DEP" : "WDR");
			const transaction = await createLedgerTransaction({
				session,
				actor: request.adminUser,
				reference,
				type: direction === "credit" ? "deposit" : "withdrawal",
				direction,
				amountMinor,
				currency: account.currency,
				paymentMethod,
				member: memberId,
				savingsAccount: account._id,
				cashSession: cashSession?._id,
				description: description.trim() || (direction === "credit" ? "Savings deposit" : "Savings withdrawal"),
				metadata: direction === "debit" ? { identityVerified: true, verifiedBy: String(request.adminUser._id) } : {},
			});
			const lines = journalLinesForSavings({
				settlementAccount: settlement,
				savingsAccount: savingsLiability,
				amountMinor,
				direction,
				description: transaction.description,
			});
			const journalEntry = await postJournal({ session, actor: request.adminUser, description: transaction.description, sourceType: "transaction", sourceId: transaction._id, currency: account.currency, lines, reference: generateReference("JE") });
			account.balanceMinor = balances.balanceMinor;
			account.availableBalanceMinor = balances.availableBalanceMinor;
			await account.save({ session });
			transaction.metadata = { journalEntry: journalEntry._id };
			await transaction.save({ session });
			if (cashSession) await recordCashMovement(cashSession, transaction, amountMinor, direction === "credit" ? "cash_in" : "cash_out", session);
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: `savings.${direction === "credit" ? "deposit" : "withdrawal"}.posted`,
				resourceType: "SavingsAccount",
				resourceId: account._id,
				outcome: "success",
				details: { reference, amountMinor, currency: account.currency, transaction: transaction._id, journalEntry: journalEntry._id, identityVerified: direction === "debit" },
			}], { session });
			return { account, transaction, journalEntry };
		});
		return response.status(201).json({ message: direction === "credit" ? "Deposit posted." : "Withdrawal posted.", ...result });
	} catch (error) {
		const status = error.status || (error.code === 11000 ? 409 : error instanceof RangeError ? 409 : error instanceof TypeError ? 400 : 500);
		console.error("Savings operation failed:", error.message);
		return response.status(status).json({ message: error.message || "Savings operation could not be completed." });
	}
}

export const deposit = (request, response) => postSavingsMovement(request, response, "credit");
export const withdraw = (request, response) => postSavingsMovement(request, response, "debit");