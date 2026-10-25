import Transaction from "../models/Transaction.js";
import JournalEntry from "../models/JournalEntry.js";
import Account from "../models/Account.js";
import { summarizeJournalLedger, summarizeTransactions } from "../services/reportService.js";

export async function financialReport(request, response) {
	const from = request.query.from ? new Date(request.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const to = request.query.to ? new Date(request.query.to) : new Date();
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
		return response.status(400).json({ message: "Provide valid from/to dates with from earlier than to." });
	}
	if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) {
		return response.status(400).json({ message: "Report date range cannot exceed 366 days." });
	}

	try {
		const transactions = await Transaction.find({
			status: "posted",
			createdAt: { $gte: from, $lte: to },
		}).select("type direction amountMinor currency createdAt").lean();
		const totals = summarizeTransactions(transactions);
		const byType = transactions.reduce((summary, transaction) => {
			const key = `${transaction.currency || "ETB"}:${transaction.type}`;
			summary[key] ??= { currency: transaction.currency || "ETB", type: transaction.type, count: 0, totalMinor: 0 };
			summary[key].count += 1;
			summary[key].totalMinor += transaction.amountMinor;
			if (!Number.isSafeInteger(summary[key].totalMinor)) throw new RangeError("Report total exceeds supported amount range.");
			return summary;
		}, {});
		return response.json({
			period: { from: from.toISOString(), to: to.toISOString() },
			transactionCount: transactions.length,
			totals,
			byType: Object.values(byType),
		});
	} catch (error) {
		console.error("Unable to generate financial report:", error.message);
		return response.status(500).json({ message: "Financial report could not be generated." });
	}
}

export async function ledgerReport(request, response) {
	const to = request.query.to ? new Date(request.query.to) : new Date();
	const from = request.query.from ? new Date(request.query.from) : new Date(to.getFullYear(), to.getMonth(), 1);
	if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return response.status(400).json({ message: "Provide valid from/to dates with from earlier than to." });
	if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000) return response.status(400).json({ message: "Report date range cannot exceed 366 days." });
	try {
		const startOfYear = new Date(to.getFullYear(), 0, 1);
		const [accounts, balanceEntries, periodEntries, yearToDateEntries] = await Promise.all([
			Account.find({ currency: "ETB" }).sort({ code: 1 }).lean(),
			JournalEntry.find({ status: "posted", date: { $lte: to } }).select("status lines date currency").lean(),
			JournalEntry.find({ status: "posted", date: { $gte: from, $lte: to } }).select("status lines date currency").lean(),
			JournalEntry.find({ status: "posted", date: { $gte: startOfYear, $lte: to } }).select("status lines date currency").lean(),
		]);
		const trialBalance = summarizeJournalLedger(balanceEntries, accounts);
		const periodLedger = summarizeJournalLedger(periodEntries, accounts);
		const yearToDateLedger = summarizeJournalLedger(yearToDateEntries, accounts);
		const postingRows = (rows) => rows.rows.filter((row) => row.accountType !== "group");
		const incomeRows = postingRows(periodLedger.rows).filter((row) => ["income", "expense"].includes(row.category));
		const incomeTotals = incomeRows.reduce((result, row) => {
			if (row.category === "income") result.incomeMinor += row.creditMinor - row.debitMinor;
			if (row.category === "expense") result.expenseMinor += row.debitMinor - row.creditMinor;
			return result;
		}, { incomeMinor: 0, expenseMinor: 0 });
		const balanceRows = postingRows(trialBalance.rows).filter((row) => ["asset", "liability", "equity"].includes(row.category));
		const balanceTotals = balanceRows.reduce((result, row) => {
			if (row.category === "asset") result.assetsMinor += row.debitBalanceMinor - row.creditBalanceMinor;
			if (row.category === "liability") result.liabilitiesMinor += row.creditBalanceMinor - row.debitBalanceMinor;
			if (row.category === "equity") result.equityMinor += row.creditBalanceMinor - row.debitBalanceMinor;
			return result;
		}, { assetsMinor: 0, liabilitiesMinor: 0, equityMinor: 0 });
		const yearToDateIncomeRows = yearToDateLedger.rows.filter((row) => row.accountType !== "group" && ["income", "expense"].includes(row.category));
		const currentYearNetIncomeMinor = yearToDateIncomeRows.reduce((total, row) => total + (row.category === "income" ? row.creditMinor - row.debitMinor : row.debitMinor - row.creditMinor), 0);
		return response.json({
			period: { from: from.toISOString(), to: to.toISOString() },
			trialBalance,
			incomeStatement: { ...incomeTotals, netIncomeMinor: currentPeriodNetIncomeMinor, rows: incomeRows },
			balanceSheet: { ...balanceTotals, currentYearNetIncomeMinor, liabilitiesAndEquityMinor: balanceTotals.liabilitiesMinor + balanceTotals.equityMinor + currentYearNetIncomeMinor, rows: balanceRows },
		});
	} catch (error) {
		console.error("Unable to generate ledger reports:", error.message);
		return response.status(500).json({ message: "Ledger reports could not be generated." });
	}
}