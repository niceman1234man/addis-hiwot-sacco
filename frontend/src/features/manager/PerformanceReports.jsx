import { useState } from "react";
import { reportsApi } from "../../api/reportsApi.js";

export default function PerformanceReports() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      setReport(await reportsApi.financial());
    } catch (loadError) {
      setError(loadError.message || "Reports are unavailable.");
    } finally {
      setLoading(false);
    }
  }
  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Management</p><h1>Performance reports</h1><p>Review current financial reporting availability.</p></div></div>
    <div className="workspace-warning">Report generation is not enabled until financial data posting is implemented.</div>
    <button className="button-primary" type="button" onClick={loadReport} disabled={loading}>{loading ? "Loading…" : "Load financial report"}</button>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {report && <pre className="workspace-json">{JSON.stringify(report, null, 2)}</pre>}
  </section>;
}