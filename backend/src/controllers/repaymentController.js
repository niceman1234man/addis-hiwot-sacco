import mongoose from "mongoose";
import Loan from "../models/Loan.js";
import LoanRepayment from "../models/LoanRepayment.js";
import CashSession from "../models/CashSession.js";
import AuditLog from "../models/AuditLog.js";
import { runFinancialTransaction, createLedgerTransaction } from "../services/financialTransactions.js";
import { configuredAccount, journalLinesForRepayment, postJournal } from "../services/ledgerPosting.js";
import { generateReference } from "../utils/generateReference.js";

export async function createRepayment(request, response) {
	const { loan: loanId, paymentMethod, reference: clientReference, notes = "" } = request.body ?? {};
	const amountMinor = Number(request.body?.amountMinor);
	if (!mongoose.isValidObjectId(loanId)) return response.status(400).json({ message: "Provide a valid loan ID." });
	if (!["cash", "bank_transfer", "mobile_money", "deduction", "other"].includes(paymentMethod)) return response.status(400).json({ message: "Payment method is invalid." });
	if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return response.status(400).json({ message: "Repayment amount must be a positive integer in minor units." });
	if (typeof notes !== "string" || notes.length > 500) return response.status(400).json({ message: "Notes must be 500 characters or fewer." });
	if (clientReference && (typeof clientReference !== "string" || clientReference.length > 100)) return response.status(400).json({ message: "Reference must be 100 characters or fewer." });

	try {
		const result = await runFinancialTransaction(async (session) => {
			const loan = await Loan.findById(loanId).session(session);
			if (!loan) {
				const error = new Error("Loan was not found.");
				error.status = 404;
				throw error;
			}
			if (!["active", "disbursed"].includes(loan.status)) {
				const error = new Error("Repayments can only be recorded against an active loan.");
				error.status = 409;
				throw error;
			}
			if (request.adminUser.role === "cashier" && loan.member.toString() === request.adminUser._id.toString()) {
				const error = new Error("Cashiers cannot record a repayment on their own member account.");
				error.status = 403;
				throw error;
			}
			const outstandingMinor = loan.outstandingPrincipalMinor + loan.outstandingInterestMinor;
			if (amountMinor > outstandingMinor) {
				const error = new Error("Repayment cannot exceed the outstanding principal and interest.");
				error.status = 400;
				throw error;
			}
			let remainingPaymentMinor = amountMinor;
			let principalPaidMinor = 0;
			let interestPaidMinor = 0;
			for (const installment of loan.repaymentSchedule) {
				if (remainingPaymentMinor === 0) break;
				const interestDue = installment.interestDueMinor - installment.interestPaidMinor;
				const interestPayment = Math.min(remainingPaymentMinor, interestDue);
				installment.interestPaidMinor += interestPayment;
				interestPaidMinor += interestPayment;
				remainingPaymentMinor -= interestPayment;
				const principalDue = installment.principalDueMinor - installment.principalPaidMinor;
				const principalPayment = Math.min(remainingPaymentMinor, principalDue);
				installment.principalPaidMinor += principalPayment;
				principalPaidMinor += principalPayment;
				remainingPaymentMinor -= principalPayment;
				installment.status = installment.interestPaidMinor === installment.interestDueMinor && installment.principalPaidMinor === installment.principalDueMinor
					? "paid"
					: installment.interestPaidMinor > 0 || installment.principalPaidMinor > 0 ? "partial" : installment.status;
			}
			if (remainingPaymentMinor > 0 || principalPaidMinor + interestPaidMinor !== amountMinor) {
				const error = new Error("Repayment could not be allocated to the remaining schedule.");
				error.status = 409;
				throw error;
			}
			let cashSession = null;
			if (paymentMethod === "cash") {
				cashSession = await CashSession.findOne({ cashier: request.adminUser._id, status: "open" }).session(session);
				if (!cashSession) {
					const error = new Error("Open a cashier session before accepting a cash repayment.");
					error.status = 409;
					throw error;
				}
			}
			const settlement = await configuredAccount(paymentMethod === "cash" ? "cash" : paymentMethod === "mobile_money" ? "mobile_money" : "bank", loan.currency, session);
			const loanReceivable = await configuredAccount("loan_receivable", loan.currency, session);
			const interestIncome = interestPaidMinor ? await configuredAccount("interest_income", loan.currency, session) : null;
			const receipt = generateReference("RCP");
			const transaction = await createLedgerTransaction({
				session,
				actor: request.adminUser,
				reference: generateReference("TXN"),
				receiptNumber: receipt,
				type: "loan_repayment",
				direction: "credit",
				amountMinor,
				currency: loan.currency,
				paymentMethod,
				member: loan.member,
				loan: loan._id,
				cashSession: cashSession?._id,
				description: notes.trim() || `Repayment for ${loan.loanNumber}`,
			});
			const repaymentReference = generateReference("REP");
			const [repayment] = await LoanRepayment.create([{
				reference: repaymentReference,
				loan: loan._id,
				member: loan.member,
				transaction: transaction._id,
				currency: loan.currency,
				amountMinor,
				principalPaidMinor,
				interestPaidMinor,
				penaltyPaidMinor: 0,
				paymentMethod,
				receivedBy: request.adminUser._id,
				notes: notes.trim(),
			}], { session });
			const journalEntry = await postJournal({
				session,
				actor: request.adminUser,
				description: transaction.description,
				sourceType: "repayment",
				sourceId: repayment._id,
				currency: loan.currency,
				lines: journalLinesForRepayment({ settlementAccount: settlement, loanAccount: loanReceivable, interestAccount: interestIncome, principalMinor: principalPaidMinor, interestMinor: interestPaidMinor, description: transaction.description }),
				reference: generateReference("JE"),
			});
			loan.outstandingPrincipalMinor -= principalPaidMinor;
			loan.outstandingInterestMinor -= interestPaidMinor;
			if (loan.outstandingPrincipalMinor === 0 && loan.outstandingInterestMinor === 0) loan.status = "paid_off";
			await loan.save({ session });
			transaction.repayment = repayment._id;
			transaction.metadata = { journalEntry: journalEntry._id, receiptNumber: receipt };
			await transaction.save({ session });
			if (cashSession) {
				cashSession.movements.push({ transaction: transaction._id, type: "cash_in", amountMinor, reference: transaction.reference, note: transaction.description });
				cashSession.expectedClosingMinor = cashSession.openingFloatMinor + cashSession.movements.reduce((total, movement) => total + (movement.type === "cash_in" ? movement.amountMinor : movement.type === "cash_out" ? -movement.amountMinor : 0), 0);
				await cashSession.save({ session });
			}
			await AuditLog.create([{
				actor: request.adminUser._id,
				actorRole: request.adminUser.role,
				action: "loan.repayment.posted",
				resourceType: "LoanRepayment",
				resourceId: repayment._id,
				outcome: "success",
				details: { loan: loan._id, transaction: transaction._id, amountMinor, principalPaidMinor, interestPaidMinor, journalEntry: journalEntry._id },
			}], { session });
			return { repayment, loan, transaction, journalEntry, receiptNumber: receipt };
		});
		return response.status(201).json({ message: "Loan repayment recorded.", ...result });
	} catch (error) {
		console.error("Unable to record loan repayment:", error.message);
		return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Loan repayment could not be recorded." });
	}
}