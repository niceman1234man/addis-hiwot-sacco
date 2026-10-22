export function summarizeTransactions(transactions = []) {
  return transactions.reduce((summary, transaction) => {
    if (transaction.status !== "posted") return summary;
    const currency = transaction.currency || "ETB";
    summary[currency] ??= { creditsMinor: 0, debitsMinor: 0, count: 0 };
    const key = transaction.direction === "credit" ? "creditsMinor" : "debitsMinor";
    summary[currency][key] += transaction.amountMinor;
    summary[currency].count += 1;
    if (!Number.isSafeInteger(summary[currency][key])) throw new RangeError("Report total exceeds safe integer range.");
    return summary;
  }, {});
}