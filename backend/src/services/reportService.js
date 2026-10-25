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

export function summarizeJournalLedger(entries = [], accounts = []) {
  const accountById = new Map(accounts.map((account) => [String(account._id), account]));
  const parentIds = new Set(accounts.map((account) => String(account.parent?._id || account.parent)).filter((id) => id !== "null" && id !== "undefined"));
  const totalsByAccount = new Map();
  let debitMinor = 0;
  let creditMinor = 0;

  for (const entry of entries) {
    if (entry.status !== "posted") continue;
    for (const line of entry.lines || []) {
      const accountId = String(line.account?._id || line.account);
      const totals = totalsByAccount.get(accountId) || { debitMinor: 0, creditMinor: 0 };
      totals.debitMinor += line.debitMinor || 0;
      totals.creditMinor += line.creditMinor || 0;
      if (!Number.isSafeInteger(totals.debitMinor) || !Number.isSafeInteger(totals.creditMinor)) throw new RangeError("Ledger balance exceeds safe integer range.");
      totalsByAccount.set(accountId, totals);
      debitMinor += line.debitMinor || 0;
      creditMinor += line.creditMinor || 0;
      if (!Number.isSafeInteger(debitMinor) || !Number.isSafeInteger(creditMinor)) throw new RangeError("Trial balance exceeds safe integer range.");
    }
  }

  const rows = accounts.map((account) => {
    const totals = totalsByAccount.get(String(account._id)) || { debitMinor: 0, creditMinor: 0 };
    return { accountId: String(account._id), code: account.code, name: account.name, category: account.category, normalBalance: account.normalBalance, accountType: account.accountType || (parentIds.has(String(account._id)) ? "group" : "posting"), parent: account.parent ? String(account.parent?._id || account.parent) : null, debitMinor: totals.debitMinor, creditMinor: totals.creditMinor };
  });

  const rowsById = new Map(rows.map((row) => [row.accountId, row]));
  for (const row of [...rows].sort((a, b) => b.code.localeCompare(a.code))) {
    if (!row.parent) continue;
    const parent = rowsById.get(row.parent);
    if (!parent) continue;
    parent.debitMinor += row.debitMinor;
    parent.creditMinor += row.creditMinor;
    if (!Number.isSafeInteger(parent.debitMinor) || !Number.isSafeInteger(parent.creditMinor)) throw new RangeError("Parent account roll-up exceeds safe integer range.");
  }

  const statementRows = rows.map((row) => {
    const debitBalanceMinor = Math.max(0, row.debitMinor - row.creditMinor);
    const creditBalanceMinor = Math.max(0, row.creditMinor - row.debitMinor);
    return { ...row, debitBalanceMinor, creditBalanceMinor };
  });
  return { rows: statementRows, totalDebitMinor: debitMinor, totalCreditMinor: creditMinor, balanced: debitMinor === creditMinor };
}