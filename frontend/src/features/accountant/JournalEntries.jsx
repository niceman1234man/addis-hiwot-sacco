import { useEffect, useState } from "react";
import { accountingApi } from "../../api/accountingApi.js";
import Table from "../../components/common/Table.jsx";

const initialValues = { description: "", debitAccountId: "", creditAccountId: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" };

export default function JournalEntries() {
  const [accounts, setAccounts] = useState([]);
  const [values, setValues] = useState(initialValues);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [journals, setJournals] = useState([]);
  const [journalLoading, setJournalLoading] = useState(true);

  async function loadJournals() {
    setJournalLoading(true);
    try {
      const result = await accountingApi.journals("?limit=50");
      setJournals(result.journals || []);
    } catch (loadError) {
      setError(loadError.message || "Journal entries could not be loaded.");
    } finally {
      setJournalLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    accountingApi.accounts("?active=true")
      .then((result) => {
        if (active) setAccounts(result.accounts || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Accounts could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);
  useEffect(() => { loadJournals(); }, []);

  const parentIds = new Set(accounts.map((account) => account.parent?._id || account.parent).filter(Boolean));
  const postableAccounts = accounts.filter((account) => account.isActive !== false && account.accountType !== "group" && account.allowManualPosting !== false && !account.isSystemMapped && !account.isSystem && !account.systemKey && !parentIds.has(account._id));
  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const amountMinor = Math.round(Number(values.amount) * 100);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error("Enter a valid positive amount.");
      if (!values.debitAccountId || !values.creditAccountId || values.debitAccountId === values.creditAccountId) {
        throw new Error("Choose two different posting accounts.");
      }
      const result = await accountingApi.createJournal({
        description: values.description,
        date: values.date,
        currency: "ETB",
        lines: [
          { account: values.debitAccountId, debitMinor: amountMinor, creditMinor: 0, description: values.notes },
          { account: values.creditAccountId, debitMinor: 0, creditMinor: amountMinor, description: values.notes },
        ],
      });
      setNotice(result.message || "Balanced journal posted.");
      setValues(initialValues);
      await loadJournals();
    } catch (submitError) {
      setError(submitError.message || "Journal could not be posted.");
    } finally {
      setBusy(false);
    }
  }

  function accountOptions(selectedId) {
    return postableAccounts
      .filter((account) => account._id === selectedId || account._id !== (selectedId === values.debitAccountId ? values.creditAccountId : values.debitAccountId))
      .map((account) => <option value={account._id} key={account._id}>{account.code} — {account.name} ({account.category})</option>);
  }

  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Accounting</p><h1>Create journal entry</h1><p>Record a balanced manual journal against active, postable ledger accounts.</p></div><span className="workspace-status">Posts immediately</span></div>
    <div className="workspace-warning">Every entry is posted immediately and must balance. Choose leaf accounts only; parent accounts and accounts marked non-posting are excluded.</div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {notice && <p className="workspace-feedback" role="status">{notice}</p>}
    {!loading && postableAccounts.length === 0 && <div className="workspace-empty"><strong>No postable accounts available</strong><span>Activate or configure leaf accounts with manual posting enabled in the Chart of Accounts.</span></div>}
    <form className="workspace-form" onSubmit={submit}>
      <div className="workspace-fields">
        <label className="workspace-field workspace-field-wide"><span>Description *</span><input required maxLength={500} value={values.description} onChange={setField("description")} placeholder="Describe the accounting event" /></label>
        <label className="workspace-field"><span>Debit account *</span><select required value={values.debitAccountId} onChange={setField("debitAccountId")} disabled={loading}><option value="">{loading ? "Loading accounts…" : "Select debit account"}</option>{accountOptions(values.debitAccountId)}</select></label>
        <label className="workspace-field"><span>Credit account *</span><select required value={values.creditAccountId} onChange={setField("creditAccountId")} disabled={loading}><option value="">{loading ? "Loading accounts…" : "Select credit account"}</option>{accountOptions(values.creditAccountId)}</select></label>
        <label className="workspace-field"><span>Amount (ETB) *</span><input type="number" min="0.01" step="0.01" required value={values.amount} onChange={setField("amount")} placeholder="0.00" /></label>
        <label className="workspace-field"><span>Entry date *</span><input type="date" required value={values.date} onChange={setField("date")} /></label>
        <label className="workspace-field workspace-field-wide"><span>Notes</span><textarea maxLength={250} rows={3} value={values.notes} onChange={setField("notes")} placeholder="Optional line note" /></label>
      </div>
      <div className="workspace-form-actions"><button className="button-primary" type="submit" disabled={busy || loading || postableAccounts.length === 0}>{busy ? "Posting…" : "Post balanced journal"}</button><span>Both sides use the same amount, so total debits equal total credits.</span></div>
    </form>
    <div className="workspace-panel-heading journal-register-heading"><div><p className="workspace-kicker">Posted ledger</p><h2>Journal register</h2><p>Recent posted entries and their account lines.</p></div><button className="button-secondary" type="button" onClick={loadJournals} disabled={journalLoading}>{journalLoading ? "Loading…" : "Refresh register"}</button></div>
    {journalLoading ? <div className="workspace-empty"><strong>Loading journal entries…</strong></div> : journals.length ? <Table getRowKey={(journal) => journal._id} columns={[{ key: "entryNumber", label: "Journal reference" }, { key: "date", label: "Date", render: (journal) => new Date(journal.date).toLocaleDateString() }, { key: "description", label: "Description" }, { key: "sourceType", label: "Source" }, { key: "lines", label: "Journal lines", render: (journal) => <div className="journal-lines-summary">{journal.lines.map((line, index) => <span key={`${journal._id}-${index}`}>{line.account?.code} — {line.account?.name}: {line.debitMinor ? `Dr ${(line.debitMinor / 100).toFixed(2)}` : `Cr ${(line.creditMinor / 100).toFixed(2)}`}</span>)}</div> }]} rows={journals} /> : <div className="workspace-empty"><strong>No posted journal entries</strong><span>Financial operations and manual journals will appear here.</span></div>}
  </section>;
}
