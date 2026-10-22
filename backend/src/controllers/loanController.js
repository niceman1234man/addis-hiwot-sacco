import mongoose from "mongoose";
import Loan from "../models/Loan.js";
import Member from "../models/Member.js";
import SavingsAccount from "../models/SavingsAccount.js";
import AuditLog from "../models/AuditLog.js";
import CashSession from "../models/CashSession.js";
import { runFinancialTransaction, createLedgerTransaction } from "../services/financialTransactions.js";
import { configuredAccount, postJournal } from "../services/ledgerPosting.js";
import { buildMonthlyAmortizationSchedule } from "../services/loanService.js";
import { generateReference } from "../utils/generateReference.js";

function invalid(status, message) {
	const error = new Error(message);
	error.status = status;
	return error;
}

export async function createLoan(request, response) {
	const body = request.body ?? {};
	const principalMinor = Number(body.principalMinor);
	const interestRateBps = Number(body.interestRateBps);
	const termMonths = Number(body.termMonths);
	if (!mongoose.isValidObjectId(body.member)) return response.status(400).json({ message: "Provide a valid member ID." });
	if (!Number.isSafeInteger(principalMinor) || principalMinor <= 0) return response.status(400).json({ message: "Loan principal must be a positive integer in minor units." });
	if (!Number.isSafeInteger(interestRateBps) || interestRateBps < 0 || interestRateBps > 10000) return response.status(400).json({ message: "Interest rate must be between 0 and 10000 basis points." });
	if (!Number.isSafeInteger(termMonths) || termMonths < 1 || termMonths > 600) return response.status(400).json({ message: "Loan term must be from 1 to 600 months." });
	if (typeof body.productName !== "string" || !body.productName.trim() || typeof body.purpose !== "string" || !body.purpose.trim()) return response.status(400).json({ message: "Loan product and purpose are required." });
	if (body.repaymentFrequency && body.repaymentFrequency !== "monthly") return response.status(400).json({ message: "Only monthly repayments are currently supported." });
	if (body.savingsAccount && !mongoose.isValidObjectId(body.savingsAccount)) return response.status(400).json({ message: "Savings account ID is invalid." });

	try {
		const loan = await runFinancialTransaction(async (session) => {
			const member = await Member.findOne({
				_id: body.member,
				$or: [{ status: "approved" }, { membershipStatus: "active" }],
			}).session(session);
			if (!member) throw invalid(404, "An approved active member is required to apply for a loan.");
			if (body.savingsAccount) {
				const account = await SavingsAccount.findOne({ _id: body.savingsAccount, member: member._id, status: "active" }).session(session);
				if (!account) throw invalid(400, "The selected active savings account does not belong to the member.");
			}
			const [created] = await Loan.create([{
				loanNumber: generateReference("LOAN"),
				member: member._id,
				savingsAccount: body.savingsAccount || null,
				productName: body.productName.trim(),
				purpose: body.purpose.trim(),
				currency: typeof body.currency === "string" && /^[A-Z]{3}$/i.test(body.currency) ? body.currency.toUpperCase() : "ETB",
				principalMinor,
				interestRateBps,
				termMonths,
				repaymentFrequency: ["weekly", "biweekly", "monthly"].includes(body.repaymentFrequency) ? body.repaymentFrequency : "monthly",
				outstandingPrincipalMinor: 0,
				outstandingInterestMinor: 0,
				status: "submitted",
				submittedAt: new Date(),
				createdBy: request.adminUser._id,
			}], { session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "loan.submitted",
				resourceType: "Loan",
				resourceId: created._id,
				outcome: "success",
				details: { loanNumber: created.loanNumber, principalMinor, currency: created.currency },
			}], { session });
			return created;
		});
		return response.status(201).json({ message: "Loan application submitted for review.", loan });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Loan application could not be created." });
	}
}

export async function listLoans(request, response) {
	const filter = {};
	if (request.query.status) {
		const validStatuses = ["draft", "submitted", "under_review", "approved", "rejected", "disbursed", "active", "paid_off", "defaulted", "cancelled"];
		if (!validStatuses.includes(request.query.status)) return response.status(400).json({ message: "Loan status is invalid." });
		filter.status = request.query.status;
	}
	if (request.query.member) {
		if (!mongoose.isValidObjectId(request.query.member)) return response.status(400).json({ message: "Member ID is invalid." });
		filter.member = request.query.member;
	}
	const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100);
	try {
		const loans = await Loan.find(filter).sort({ createdAt: -1 }).limit(limit).populate("member", "firstName middleName lastName memberNumber").lean();
		return response.json({ loans });
	} catch {
		return response.status(500).json({ message: "Loans could not be loaded." });
	}
}

export async function approveLoan(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Loan ID is invalid." });
	const decision = request.body?.decision;
	if (!["approved", "rejected"].includes(decision)) return response.status(400).json({ message: "Decision must be approved or rejected." });
	const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
	if (decision === "rejected" && !reason) return response.status(400).json({ message: "A rejection reason is required." });
	if (reason.length > 1000) return response.status(400).json({ message: "Decision notes must be 1000 characters or fewer." });

	try {
		const loan = await runFinancialTransaction(async (session) => {
			const current = await Loan.findById(request.params.id).session(session);
			if (!current) throw invalid(404, "Loan application not found.");
			if (!["submitted", "under_review"].includes(current.status)) throw invalid(409, "Only submitted or under-review loans can receive a decision.");
			if (decision === "approved" && request.adminUser._id.equals(current.createdBy)) throw invalid(403, "The loan applicant cannot approve their own loan.");
			current.status = decision;
			current.approvedAt = decision === "approved" ? new Date() : null;
			current.approvedBy = decision === "approved" ? request.adminUser._id : null;
			current.rejectionReason = decision === "rejected" ? reason : "";
			await current.save({ session });
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: `loan.${decision}`,
				resourceType: "Loan",
				resourceId: current._id,
				outcome: "success",
				details: { loanNumber: current.loanNumber, reason },
			}], { session });
			return current;
		});
		return response.json({ message: `Loan ${decision}.`, loan });
	} catch (error) {
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Loan decision could not be saved." });
	}
}

export async function disburseLoan(request, response) {
	if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ message: "Loan ID is invalid." });
	const paymentMethod = request.body?.paymentMethod;
	if (!["cash", "bank_transfer", "mobile_money"].includes(paymentMethod)) return response.status(400).json({ message: "Choose cash, bank transfer, or mobile money." });
	try {
		const result = await runFinancialTransaction(async (session) => {
			const loan = await Loan.findById(request.params.id).session(session);
			if (!loan) throw invalid(404, "Loan application not found.");
			if (loan.status !== "approved") throw invalid(409, "Only approved loans can be disbursed.");
			const cashSession = paymentMethod === "cash"
				? await CashSession.findOne({ cashier: request.adminUser._id, status: "open" }).session(session)
				: null;
			if (paymentMethod === "cash" && !cashSession) throw invalid(409, "An open cashier session is required for cash disbursement.");

			const settlementCode = paymentMethod === "cash" ? "cash" : paymentMethod === "mobile_money" ? "mobile_money" : "bank";
			const settlement = await configuredAccount(settlementCode, loan.currency, session);
			const receivable = await configuredAccount("loan_receivable", loan.currency, session);
			const reference = generateReference("LND");
			const transaction = await createLedgerTransaction({
				session,
				actor: request.adminUser,
				reference,
				type: "loan_disbursement",
				direction: "debit",
				amountMinor: loan.principalMinor,
				currency: loan.currency,
				paymentMethod,
				member: loan.member,
				loan: loan._id,
				cashSession: cashSession?._id,
				description: `Disbursement for ${loan.loanNumber}`,
			});
			const journalEntry = await postJournal({
				session,
				actor: request.adminUser,
				description: transaction.description,
				sourceType: "transaction",
				sourceId: transaction._id,
				currency: loan.currency,
				lines: [
					{ account: receivable._id, debitMinor: loan.principalMinor, creditMinor: 0, description: "Loan principal receivable" },
					{ account: settlement._id, debitMinor: 0, creditMinor: loan.principalMinor, description: "Funds disbursed" },
				],
				reference: generateReference("JE"),
			});
			const repaymentPlan = buildMonthlyAmortizationSchedule(loan.principalMinor, loan.interestRateBps, loan.termMonths, new Date());
			loan.outstandingPrincipalMinor = loan.principalMinor;
			loan.outstandingInterestMinor = repaymentPlan.totalInterestMinor;
			loan.repaymentSchedule = repaymentPlan.schedule;
			loan.status = "active";
			loan.disbursedAt = new Date();
			loan.disbursedBy = request.adminUser._id;
			loan.firstDueAt = repaymentPlan.schedule[0].dueAt;
			loan.maturityAt = repaymentPlan.schedule.at(-1).dueAt;
			await loan.save({ session });
			transaction.metadata = { journalEntry: journalEntry._id };
			await transaction.save({ session });
			if (cashSession) {
				cashSession.movements.push({ transaction: transaction._id, type: "cash_out", amountMinor: loan.principalMinor, reference, note: transaction.description });
				cashSession.expectedClosingMinor = cashSession.openingFloatMinor + cashSession.movements.reduce((total, movement) => total + (movement.type === "cash_in" ? movement.amountMinor : movement.type === "cash_out" ? -movement.amountMinor : 0), 0);
				await cashSession.save({ session });
			}
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "loan.disbursed",
				resourceType: "Loan",
				resourceId: loan._id,
				outcome: "success",
				details: { reference, amountMinor: loan.principalMinor, currency: loan.currency, journalEntry: journalEntry._id },
			}], { session });
			return { loan, transaction, journalEntry };
		});
		return response.json({ message: "Loan disbursed.", ...result });
	} catch (error) {
		const status = error.status || (error.code === 11000 ? 409 : error instanceof RangeError ? 400 : 500);
		console.error("Loan disbursement failed:", error.message);
		return response.status(status).json({ message: error.message || "Loan could not be disbursed." });
	}
}