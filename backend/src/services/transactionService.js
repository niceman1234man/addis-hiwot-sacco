import { generateReference } from "../utils/generateReference.js";

export function createTransactionDraft(input, actorId) {
  if (!input || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new TypeError("Transaction amount must be a positive integer in minor units.");
  if (typeof actorId !== "string" || !/^[a-f\d]{24}$/i.test(actorId)) throw new TypeError("A valid authenticated actor ID is required.");
  if (!input.type || !input.direction || !input.paymentMethod) throw new TypeError("Transaction type, direction, and payment method are required.");
  return {
    reference: input.reference || generateReference("TXN"),
    type: input.type,
    status: "pending",
    amountMinor: input.amountMinor,
    currency: input.currency || "ETB",
    direction: input.direction,
    paymentMethod: input.paymentMethod,
    description: input.description || "",
    member: input.member || null,
    savingsAccount: input.savingsAccount || null,
    loan: input.loan || null,
    idempotencyKey: input.idempotencyKey || null,
    createdBy: actorId,
  };
}

export function assertTransactionTransition(currentStatus, nextStatus) {
  const transitions = {
    pending: new Set(["posted", "failed"]),
    posted: new Set(["reversed"]),
    failed: new Set(),
    reversed: new Set(),
  };
  if (!transitions[currentStatus]?.has(nextStatus)) {
    throw new Error(`Transaction cannot transition from ${currentStatus} to ${nextStatus}.`);
  }
}