import { useCallback, useEffect, useState } from "react";
import { axiosInstance } from "../../api/axiosInstance.js";
import { formatCurrency } from "../../utils/formatCurrency.js";

export default function CashSession() {
  const [session, setSession] = useState(null);
  const [openingFloat, setOpeningFloat] = useState("");
  const [countedClosing, setCountedClosing] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await axiosInstance.get("/cashier/sessions/current");
      setSession(result.cashSession || null);
    } catch (loadError) {
      setError(loadError.message || "Cash session could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function openSession(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await axiosInstance.post("/cashier/sessions/open", { openingFloatMinor: Math.round(Number(openingFloat) * 100), currency: "ETB" });
      setSession(result.cashSession);
      setNotice(result.message);
      setOpeningFloat("");
    } catch (saveError) {
      setError(saveError.message || "Cash session could not be opened.");
    } finally {
      setSaving(false);
    }
  }

  async function closeSession(event) {
    event.preventDefault();
    if (!session) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await axiosInstance.post("/cashier/sessions/close", {
        sessionId: session._id,
        countedClosingMinor: Math.round(Number(countedClosing) * 100),
        closingNotes: notes,
      });
      setSession(null);
      setNotice(`${result.message} Variance: ${formatCurrency(result.cashSession.varianceMinor / 100)}.`);
      setCountedClosing("");
      setNotes("");
    } catch (saveError) {
      setError(saveError.message || "Cash session could not be closed.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Cash control</p><h1>Cash session</h1><p>Open a cashier drawer, track posted movements and reconcile the counted closing cash.</p></div><button type="button" className="button-secondary" onClick={refresh} disabled={loading}><span aria-hidden="true">↻</span> Refresh</button></div>
    <div className="workspace-warning">Only posted transactions linked to this session contribute to the expected cash amount.</div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {notice && <p className="workspace-feedback" role="status">{notice}</p>}
    {loading ? <p>Loading session…</p> : session ? <>
      <div className="cash-session-summary"><div><small>Session reference</small><strong>{session.sessionNumber}</strong></div><div><small>Opened</small><strong>{new Date(session.openedAt).toLocaleString()}</strong></div><div><small>Opening float</small><strong>{formatCurrency(session.openingFloatMinor / 100, session.currency)}</strong></div><div><small>Expected cash</small><strong>{formatCurrency((session.expectedClosingMinor ?? session.openingFloatMinor) / 100, session.currency)}</strong></div></div>
      <form className="workspace-form" onSubmit={closeSession}>
        <div className="workspace-fields"><label className="workspace-field"><span>Counted closing cash (ETB) <b>*</b></span><input type="number" min="0" step="0.01" required value={countedClosing} onChange={(event) => setCountedClosing(event.target.value)} /></label><label className="workspace-field workspace-field-wide"><span>Closing / variance notes</span><textarea rows={3} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label></div>
        <div className="workspace-form-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Closing…" : "Close and reconcile"}</button><span>A non-zero variance is flagged for manager review.</span></div>
      </form>
    </> : <form className="workspace-form" onSubmit={openSession}>
      <div className="workspace-fields"><label className="workspace-field"><span>Opening float (ETB) <b>*</b></span><input type="number" min="0" step="0.01" required value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} /><small>Enter the physical cash counted at opening.</small></label></div>
      <div className="workspace-form-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Opening…" : "Open cash session"}</button><span>One open session is allowed per cashier at a branch.</span></div>
    </form>}
  </section>;
}
