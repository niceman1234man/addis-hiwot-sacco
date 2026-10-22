import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import { runFinancialTransaction, createLedgerTransaction } from "../services/financialTransactions.js";
import { generateReference } from "../utils/generateReference.js";

const types = new Set(["deposit", "withdrawal", "loan_disbursement", "loan_repayment", "fee", "interest", "expense", "adjustment", "reversal"]);
const methods = new Set(["cash", "bank_transfer", "mobile_money", "deduction", "journal", "other"]);

export async function listTransactions(request, response) {
	const filter = {};
	if (request.query.status) {
		if (!["pending", "posted", "failed", "reversed"].includes(request.query.status)) return response.status(400).json({ message: "Transaction status is invalid." });
		filter.status = request.query.status;
	}
	if (request.query.member) {
		if (!mongoose.isValidObjectId(request.query.member)) return response.status(400).json({ message: "Member ID is invalid." });
		filter.member = request.query.member;
	}
	if (request.query.type) {
		if (!types.has(request.query.type)) return response.status(400).json({ message: "Transaction type is invalid." });
		filter.type = request.query.type;
	}
	if (request.query.from || request.query.to) {
		const from = request.query.from ? new Date(request.query.from) : new Date(0);
		const to = request.query.to ? new Date(request.query.to) : new Date();
		if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return response.status(400).json({ message: "Transaction date range is invalid." });
		if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) return response.status(400).json({ message: "Transaction date range cannot exceed 366 days." });
		filter.createdAt = { $gte: from, $lte: to };
	}
	const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100);
	try {
		const transactions = await Transaction.find(filter).sort({ createdAt: -1 }).limit(limit)
			.populate("member", "firstName middleName lastName memberNumber")
			.populate("createdBy", "name email")
			.lean();
		return response.json({ transactions });
	} catch (error) {
		console.error("Unable to list transactions:", error.message);
		return response.status(500).json({ message: "Transactions could not be loaded." });
	}
}

export async function createTransaction(request, response) {
	const body = request.body ?? {};
	const amountMinor = Number(body.amountMinor);
	if (!types.has(body.type)) return response.status(400).json({ message: "Transaction type is invalid." });
	if (!methods.has(body.paymentMethod)) return response.status(400).json({ message: "Payment method is invalid." });
	if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return response.status(400).json({ message: "Amount must be a positive integer in minor units." });
	if (!["credit", "debit"].includes(body.direction)) return response.status(400).json({ message: "Transaction direction must be credit or debit." });
	if (body.member && !mongoose.isValidObjectId(body.member)) return response.status(400).json({ message: "Member ID is invalid." });
	if (body.idempotencyKey && (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length > 128)) return response.status(400).json({ message: "Idempotency key must be 128 characters or fewer." });
	const currency = typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB";

	try {
		const result = await runFinancialTransaction(async (session) => {
			if (body.idempotencyKey) {
				const previous = await Transaction.findOne({ idempotencyKey: body.idempotencyKey }).session(session);
				if (previous) {
					const sameRequest = previous.type === body.type &&
						previous.amountMinor === amountMinor &&
						previous.currency === currency &&
						previous.direction === body.direction &&
						previous.paymentMethod === body.paymentMethod &&
						String(previous.member || "") === String(body.member || "") &&
						previous.description === (typeof body.description === "string" ? body.description.slice(0, 500) : "");
					if (!sameRequest) {
						const error = new Error("Idempotency key was already used for a different transaction payload.");
						error.status = 409;
						throw error;
					}
					return { transaction: previous, duplicate: true };
				}
			}
			const reference = generateReference("TXN");
			const transaction = await createLedgerTransaction({
				session,
				actor: request.adminUser,
				reference,
				idempotencyKey: body.idempotencyKey || undefined,
				type: body.type,
				direction: body.direction,
				amountMinor,
				currency,
				paymentMethod: body.paymentMethod,
				member: body.member || null,
				savingsAccount: body.savingsAccount || null,
				loan: body.loan || null,
				description: typeof body.description === "string" ? body.description.slice(0, 500) : "",
				status: "pending",
			});
			return { transaction, duplicate: false };
		});
		return response.status(result.duplicate ? 200 : 201).json({
			message: result.duplicate ? "Existing idempotent transaction returned." : "Transaction created in pending status; it has not changed a balance.",
			transaction: result.transaction,
		});
	} catch (error) {
		console.error("Unable to create transaction:", error.message);
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Transaction could not be created." });
	}
}