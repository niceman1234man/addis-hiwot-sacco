import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import Transaction from "../models/Transaction.js";
import { generateReference } from "../utils/generateReference.js";

export async function runFinancialTransaction(callback) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function createLedgerTransaction({ session, actor, ...fields }) {
  const reference = fields.reference || generateReference("TXN");
  const isPosted = fields.status === "posted" || !fields.status;
  const [transaction] = await Transaction.create([{
    ...fields,
    reference,
    status: fields.status || "posted",
    createdBy: actor._id,
    ...(isPosted ? { postedAt: new Date(), receiptNumber: fields.receiptNumber || reference } : {}),
  }], { session });

  await AuditLog.create([{
    actor: actor._id,
    actorRole: actor.role,
    action: `transaction.${transaction.type}.${transaction.status}`,
    resourceType: "Transaction",
    resourceId: transaction._id,
    outcome: "success",
    details: { reference, amountMinor: transaction.amountMinor, currency: transaction.currency },
  }], { session });
  return transaction;
}
