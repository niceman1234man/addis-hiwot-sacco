export function validateBalancedJournalLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) throw new TypeError("A journal requires at least two lines.");
  let debitMinor = 0;
  let creditMinor = 0;
  for (const [index, line] of lines.entries()) {
    const debit = line.debitMinor ?? 0;
    const credit = line.creditMinor ?? 0;
    if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit) || debit < 0 || credit < 0) throw new TypeError(`Journal line ${index + 1} amounts must be non-negative safe integers.`);
    if ((debit > 0) === (credit > 0)) throw new TypeError(`Journal line ${index + 1} must have exactly one debit or credit.`);
    debitMinor += debit;
    creditMinor += credit;
    if (!Number.isSafeInteger(debitMinor) || !Number.isSafeInteger(creditMinor)) throw new RangeError("Journal total exceeds safe integer range.");
  }
  if (debitMinor === 0 || debitMinor !== creditMinor) throw new RangeError("Journal debits and credits must balance and be greater than zero.");
  return { debitMinor, creditMinor, balanced: true };
}

export function buildJournalLines({ debitAccount, creditAccount, amountMinor, description = "" }) {
  if (!debitAccount || !creditAccount) throw new TypeError("Debit and credit accounts are required.");
  if (debitAccount === creditAccount) throw new TypeError("Debit and credit accounts must be different.");
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new TypeError("Amount must be a positive integer in minor currency units.");
  const lines = [
    { account: debitAccount, debitMinor: amountMinor, creditMinor: 0, description },
    { account: creditAccount, debitMinor: 0, creditMinor: amountMinor, description },
  ];
  validateBalancedJournalLines(lines);
  return lines;
}