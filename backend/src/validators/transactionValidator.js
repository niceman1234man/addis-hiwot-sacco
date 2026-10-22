export function validateTransaction(body = {}) {
  const errors = {};
  const types = new Set(["deposit", "withdrawal", "loan_disbursement", "loan_repayment", "fee", "interest", "expense", "adjustment", "reversal"]);
  const methods = new Set(["cash", "bank_transfer", "mobile_money", "deduction", "journal", "other"]);
  if (!types.has(body.type)) errors.type = "Choose a supported transaction type.";
  if (!Number.isSafeInteger(Number(body.amountMinor)) || Number(body.amountMinor) <= 0) errors.amountMinor = "Amount must be a positive integer in minor currency units.";
  if (!methods.has(body.paymentMethod)) errors.paymentMethod = "Choose a supported payment method.";
  if (body.currency !== undefined && (typeof body.currency !== "string" || !/^[A-Z]{3}$/i.test(body.currency))) errors.currency = "Currency must be a three-letter ISO code.";
  return { valid: Object.keys(errors).length === 0, errors, message: Object.values(errors).join(" ") };
}