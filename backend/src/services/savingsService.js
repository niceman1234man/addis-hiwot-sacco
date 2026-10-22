function assertMinorAmount(value, name = "amountMinor") {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${name} must be a positive safe integer.`);
}

// Pure preview only. Persisting balances requires a transaction and an immutable ledger entry.
export function previewSavingsBalance({ balanceMinor, availableBalanceMinor = balanceMinor }, operation, amountMinor) {
  assertMinorAmount(amountMinor);
  if (!Number.isSafeInteger(balanceMinor) || balanceMinor < 0 || !Number.isSafeInteger(availableBalanceMinor) || availableBalanceMinor < 0) {
    throw new TypeError("Balances must be non-negative integer minor units.");
  }
  if (operation === "deposit") {
    return { balanceMinor: balanceMinor + amountMinor, availableBalanceMinor: availableBalanceMinor + amountMinor };
  }
  if (operation === "withdrawal") {
    if (amountMinor > availableBalanceMinor) throw new RangeError("Insufficient available savings balance.");
    return { balanceMinor: balanceMinor - amountMinor, availableBalanceMinor: availableBalanceMinor - amountMinor };
  }
  throw new TypeError("Operation must be deposit or withdrawal.");
}