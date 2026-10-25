import mongoose from "mongoose";
import Member from "../models/Member.js";
import CashSession from "../models/CashSession.js";
import ShareTransaction from "../models/ShareTransaction.js";
import Transaction from "../models/Transaction.js";
import JournalEntry from "../models/JournalEntry.js";
import AuditLog from "../models/AuditLog.js";
import { runFinancialTransaction, createLedgerTransaction } from "../services/financialTransactions.js";
import { configuredAccount, postJournal } from "../services/ledgerPosting.js";
import { generateReference } from "../utils/generateReference.js";

function problem(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function listShareTransactions(request, response) {
  const filter = {};
  if (request.query.member) {
    if (!mongoose.isValidObjectId(request.query.member)) return response.status(400).json({ message: "Member ID is invalid." });
    filter.member = request.query.member;
  }
  const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 50, 1), 100);
  try {
    const shareTransactions = await ShareTransaction.find(filter).sort({ createdAt: -1 }).limit(limit)
      .populate("member", "firstName middleName lastName memberNumber")
      .populate("createdBy", "name email").lean();
    return response.json({ shareTransactions });
  } catch (error) {
    console.error("Unable to list share transactions:", error.message);
    return response.status(500).json({ message: "Share purchases could not be loaded." });
  }
}

export async function purchaseShares(request, response) {
  const body = request.body ?? {};
  if (!mongoose.isValidObjectId(body.memberId)) return response.status(400).json({ message: "Select a valid member." });
  const amountMinor = Number(body.amountMinor);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return response.status(400).json({ message: "Share purchase amount must be a positive integer in minor units." });
  if (!["cash", "bank_transfer", "mobile_money"].includes(body.paymentMethod)) return response.status(400).json({ message: "Choose cash, bank transfer, or mobile money." });
  const idempotencyKey = typeof body.idempotencyKey === "string" && body.idempotencyKey.length <= 128 ? body.idempotencyKey : undefined;
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
  if (idempotencyKey) {
    try {
      const transaction = await Transaction.findOne({ idempotencyKey });
      if (transaction) {
        const shareTransaction = await ShareTransaction.findOne({ transaction: transaction._id });
        if (shareTransaction) {
          const journalEntry = await JournalEntry.findById(shareTransaction.journalEntry);
          return response.status(200).json({ message: "Share purchase was already posted.", shareTransaction, transaction, journalEntry });
        }
      }
    } catch (lookupError) {
      console.error("Unable to check share purchase idempotency:", lookupError.message);
      return response.status(500).json({ message: "Share purchase could not be checked for duplicates." });
    }
  }
  try {
    const result = await runFinancialTransaction(async (session) => {
      const member = await Member.findOne({ _id: body.memberId, $or: [{ status: "approved" }, { membershipStatus: "active" }] }).session(session);
      if (!member) throw problem(404, "An approved active member is required to buy shares.");
      let cashSession = null;
      if (body.paymentMethod === "cash") {
        cashSession = await CashSession.findOne({ cashier: request.adminUser._id, status: "open" }).session(session);
        if (!cashSession) throw problem(409, "Open a cashier session before accepting a cash share purchase.");
      }
      const currency = "ETB";
      const settlementKey = body.paymentMethod === "cash" ? "cash" : body.paymentMethod === "mobile_money" ? "mobile_money" : "bank";
      const settlement = await configuredAccount(settlementKey, currency, session);
      const shareCapital = await configuredAccount("share_capital", currency, session);
      const reference = generateReference("SHR");
      const transaction = await createLedgerTransaction({
        session,
        actor: request.adminUser,
        reference,
        idempotencyKey,
        type: "share_purchase",
        direction: "credit",
        amountMinor,
        currency,
        paymentMethod: body.paymentMethod,
        member: member._id,
        cashSession: cashSession?._id,
        description: description || `Share purchase for ${member.memberNumber || member.firstName}`,
      });
      const journalEntry = await postJournal({
        session,
        actor: request.adminUser,
        description: transaction.description,
        sourceType: "share_purchase",
        sourceId: transaction._id,
        currency,
        lines: [
          { account: settlement._id, debitMinor: amountMinor, creditMinor: 0, description: transaction.description, member: member._id },
          { account: shareCapital._id, debitMinor: 0, creditMinor: amountMinor, description: "Members' share capital", member: member._id },
        ],
        reference: generateReference("JE"),
      });
      const sharePriceMinor = Number(process.env.SACCO_SHARE_PRICE_MINOR);
      const shareUnits = Number.isSafeInteger(sharePriceMinor) && sharePriceMinor > 0 && amountMinor % sharePriceMinor === 0
        ? amountMinor / sharePriceMinor
        : null;
      const [shareTransaction] = await ShareTransaction.create([{
        reference,
        member: member._id,
        transaction: transaction._id,
        journalEntry: journalEntry._id,
        amountMinor,
        currency,
        paymentMethod: body.paymentMethod,
        shareUnits,
        sharePriceMinor: shareUnits === null ? null : sharePriceMinor,
        createdBy: request.adminUser._id,
      }], { session });
      transaction.metadata = { journalEntry: journalEntry._id, shareTransaction: shareTransaction._id };
      await transaction.save({ session });
      if (cashSession) {
        cashSession.movements.push({ transaction: transaction._id, type: "cash_in", amountMinor, reference, note: transaction.description });
        cashSession.expectedClosingMinor = cashSession.openingFloatMinor + cashSession.movements.reduce((total, movement) => total + (movement.type === "cash_in" ? movement.amountMinor : movement.type === "cash_out" ? -movement.amountMinor : 0), 0);
        await cashSession.save({ session });
      }
      await AuditLog.create([{
        actor: request.adminUser._id,
        actorRole: request.adminUser.role,
        action: "shares.purchase.posted",
        resourceType: "ShareTransaction",
        resourceId: shareTransaction._id,
        outcome: "success",
        details: { reference, member: member._id, amountMinor, currency, journalEntry: journalEntry._id },
      }], { session });
      return { shareTransaction, transaction, journalEntry };
    });
    return response.status(201).json({ message: "Share purchase posted.", ...result });
  } catch (error) {
    console.error("Share purchase failed:", error.message);
    return response.status(error.status || (error.code === 11000 ? 409 : 500)).json({ message: error.message || "Share purchase could not be completed." });
  }
}
