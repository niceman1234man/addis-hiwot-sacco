import { useState } from "react";
import { reportsApi } from "../../api/reportsApi.js";
import Table from "../../components/common/Table.jsx";

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const money = (minor) => `${((minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

export default function FinancialReports() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadReport(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      setReport(await reportsApi.ledger(`?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`));
    } catch (loadError) {
      setError(loadError.message || "Ledger reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Accounting</p><h1>Financial reports</h1><p>View the journal-derived trial balance, income statement, and balance sheet.</p></div></div>
    <form className="workspace-form report-period-form" onSubmit={loadReport}>
      <div className="workspace-fields">
        <label className="workspace-field"><span>Period from</span><input type="date" required value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="workspace-field"><span>Period to</span><input type="date" required value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>
      <div className="workspace-form-actions"><button className="button-primary" type="submit" disabled={loading}>{loading ? "Preparing reports…" : "Generate reports"}</button><span>Trial balance and balance sheet include posted journal history through the end date.</span></div>
    </form>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {report && <div className="ledger-report-sections">
      <section className="ledger-report-block">
        <div className="workspace-panel-heading"><div><p className="workspace-kicker">All posted entries through {new Date(report.period.to).toLocaleDateString()}</p><h2>Trial balance</h2></div><span className={`workspace-status${report.trialBalance.balanced ? "" : " status-unbalanced"}`}>{report.trialBalance.balanced ? "Balanced" : "Out of balance"}</span></div>
        <Table getRowKey={(row) => row.accountId} columns={[{ key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "category", label: "Category" }, { key: "debitBalanceMinor", label: "Debit balance", render: (row) => money(row.debitBalanceMinor) }, { key: "creditBalanceMinor", label: "Credit balance", render: (row) => money(row.creditBalanceMinor) }]} rows={report.trialBalance.rows.filter((row) => row.debitMinor || row.creditMinor)} />
        <div className="ledger-report-total"><strong>Trial balance totals</strong><span>Debits {money(report.trialBalance.totalDebitMinor)} · Credits {money(report.trialBalance.totalCreditMinor)}</span></div>
      </section>
      <section className="ledger-report-block">
        <div className="workspace-panel-heading"><div><p className="workspace-kicker">Selected period</p><h2>Income statement</h2></div></div>
        <div className="workspace-metrics workspace-metrics-compact"><article><span>Income</span><strong>{money(report.incomeStatement.incomeMinor)}</strong></article><article><span>Expenses</span><strong>{money(report.incomeStatement.expenseMinor)}</strong></article><article><span>Net income</span><strong>{money(report.incomeStatement.netIncomeMinor)}</strong></article></div>
        <Table getRowKey={(row) => row.accountId} columns={[{ key: "code", label: "Code" }, { key: "name", label: "Account" }, { key: "category", label: "Category" }, { key: "debitMinor", label: "Debits", render: (row) => money(row.debitMinor) }, { key: "creditMinor", label: "Credits", render: (row) => money(row.creditMinor) }]} rows={report.incomeStatement.rows.filter((row) => row.debitMinor || row.creditMinor)} />
      </section>
      <section className="ledger-report-block">
        <div className="workspace-panel-heading"><div><p className="workspace-kicker">As of period end</p><h2>Balance sheet summary</h2></div></div>
        <div className="workspace-metrics workspace-metrics-compact"><article><span>Assets</span><strong>{money(report.balanceSheet.assetsMinor)}</strong></article><article><span>Liabilities</span><strong>{money(report.balanceSheet.liabilitiesMinor)}</strong></article><article><span>Equity incl. YTD result</span><strong>{money(report.balanceSheet.equityMinor + report.balanceSheet.currentYearNetIncomeMinor)}</strong></article></div>
        <p className="workspace-inline-note">Liabilities plus equity including the year-to-date result: {money(report.balanceSheet.liabilitiesAndEquityMinor)}. This summary uses posted ledger activity and does not replace audited statutory statements.</p>
      </section>
    </div>}
  </section>;
}
