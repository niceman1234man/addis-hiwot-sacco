import { generateReference } from "./generateReference.js";

export function generateReceipt(transaction = {}) {
  return {
    receiptNumber: transaction.reference || generateReference("RCP"),
    issuedAt: new Date().toISOString(),
    transaction,
  };
}