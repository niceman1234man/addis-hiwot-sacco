import mongoose from "mongoose";
import Account from "../models/Account.js";
import JournalEntry from "../models/JournalEntry.js";
import { buildJournalLines } from "./accountingService.js";
import { createLedgerTransaction } from "./financialTransactions.js";
import { generateReference } from "../utils/generateReference.js";

const accountSettingByCode = Object.freeze({
  cash: "SACCO_CASH_ACCOUNT_ID",
  bank: "SACCO_BANK_ACCOUNT_ID",
  mobile_money: "SACCO_MOBILE_MONEY_ACCOUNT_ID",
  savings: "SACCO_SAVINGS_LIABILITY_ACCOUNT_ID",
  loan_receivable: "SACCO_LOAN_RECEIVABLE_ACCOUNT_ID",
  interest_income: "SACCO_INTEREST_INCOME_ACCOUNT_ID",
  fees_income: "SACCO_FEES_INCOME_ACCOUNT_ID",
  expense: "SACCO_EXPENSE_ACCOUNT_ID",
});

export async function configuredAccount(code, currency, session) {
  const systemAccount = await Account.findOne({ systemKey: code, isActive: true, currency }).session(session);
  if (systemAccount) return systemAccount;
  const setting = accountSettingByCode[code];
  const id = setting && process.env[setting];
  if (!id || !mongoose.isValidObjectId(id)) {
    const error = new Error(`Financial posting is unavailable: configure ${setting || code}.`);
    error.status = 503;
    throw error;
  }
  const account = await Account.findOne({ _id: id, isActive: true, currency }).session(session);
  if (!account) {
    const error = new Error(`Financial posting account ${code} is missing, inactive, or has a different currency.`);
    error.status = 503;
    throw error;
  }
  return account;
}

export async function postJournal({ session, actor, description, sourceType, sourceId, currency = "ETB", lines, reference }) {
  const referenceNumber = reference || generateReference("JE");
  const [entry] = await JournalEntry.create([{
    entryNumber: referenceNumber,
    date: new Date(),
    description,
    currency,
    lines,
    status: "posted",
    sourceType,
    sourceId,
    createdBy: actor._id,
    postedBy: actor._id,
    postedAt: new Date(),
  }], { session });
  return entry;
}

export async function postCashOperation({ session, actor, type, direction, amountMinor, currency, paymentMethod, member, savingsAccount, loan, description, cashSession }) {
  const cashAccountCode = paymentMethod === "cash" ? "cash" : paymentMethod === "mobile_money" ? "mobile_money" : "bank";
  const settlement = await configuredAccount(cashAccountCode, currency, session);
  const reference = generateReference("TXN");
  const transaction = await createLedgerTransaction({
    session,
    actor,
    reference,
    type,
    direction,
    amountMinor,
    currency,
    paymentMethod,
    member,
    savingsAccount,
    loan,
    cashSession,
    description,
  });
  return { transaction, settlement };
}

export function journalLinesForSavings({ settlementAccount, savingsAccount, amountMinor, direction, description }) {
  const debit = direction === "credit" ? settlementAccount : savingsAccount;
  const credit = direction === "credit" ? savingsAccount : settlementAccount;
  return buildJournalLines({ debitAccount: debit._id, creditAccount: credit._id, amountMinor, description });
}

export function journalLinesForRepayment({ settlementAccount, loanAccount, interestAccount, principalMinor, interestMinor, description }) {
  const lines = [];
  const total = principalMinor + interestMinor;
  if (!Number.isSafeInteger(total) || total <= 0) throw new TypeError("Repayment total must be positive integer minor units.");
  lines.push({ account: settlementAccount._id, debitMinor: total, creditMinor: 0, description });
  if (principalMinor) lines.push({ account: loanAccount._id, debitMinor: 0, creditMinor: principalMinor, description: "Principal repayment" });
  if (interestMinor) lines.push({ account: interestAccount._id, debitMinor: 0, creditMinor: interestMinor, description: "Interest income" });
  return lines;
}
