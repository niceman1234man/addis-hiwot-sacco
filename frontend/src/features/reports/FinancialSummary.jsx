import { useState } from "react";
import { reportsApi } from "../../api/reportsApi.js";
import { formatCurrency } from "../../utils/formatCurrency.js";

export default function FinancialSummary() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setSummary(await reportsApi.financial());
    } catch (loadError) {
      setError(loadError.message || "The report could not be loaded.");
    } finally {
      setLoading(false);
    }
  }
  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Reports</p><h1>Financial summary</h1><p>Aggregated view of recorded cooperative activity.</p></div></div>
    <div className="workspace-warning">Financial reports are unavailable until approved postings and the ledger service are active.</div>
    <button className="button-primary" type="button" disabled={loading} onClick={load}>{loading ? "Loading…" : "Load financial summary"}</button>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {summary && <div className="workspace-metrics workspace-metrics-compact">{Object.entries(summary.totals || {}).map(([currency, totals]) => <article key={currency}><span>{currency} credits</span><strong>{formatCurrency(totals.creditsMinor / 100, currency)}</strong><small>{totals.count} posted transactions · debits {formatCurrency(totals.debitsMinor / 100, currency)}</small></article>)}</div>}
  </section>;
}
