import Transaction from "../models/Transaction.js";
import { summarizeTransactions } from "../services/reportService.js";

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