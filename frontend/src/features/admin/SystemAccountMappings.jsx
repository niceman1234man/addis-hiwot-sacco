import { useCallback, useEffect, useState } from "react";
import { accountingApi } from "../../api/accountingApi.js";

export default function SystemAccountMappings() {
  const [mappings, setMappings] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMappings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await accountingApi.systemAccountMappings();
      setMappings(result.mappings || []);
      setAccounts(result.accounts || []);
      setSelections(Object.fromEntries((result.mappings || []).map((mapping) => [mapping.key, mapping.account?._id || ""])));
    } catch (loadError) {
      setError(loadError.message || "System mappings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMappings(); }, [loadMappings]);

  const parentIds = new Set(accounts.map((account) => account.parent?._id || account.parent).filter(Boolean));
  const selectedKeys = Object.fromEntries(mappings.map((mapping) => [mapping.account?._id, mapping.key]));

  async function saveMapping(mapping) {
    const accountId = selections[mapping.key];
    if (!accountId) {
      setError(`Select an account for ${mapping.label}.`);
      return;
    }
    setSavingKey(mapping.key);
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.updateSystemAccountMapping(mapping.key, accountId);
      setNotice(result.message || `${mapping.label} mapping saved.`);
      await loadMappings();
    } catch (saveError) {
      setError(saveError.message || "System mapping could not be saved.");
    } finally {
      setSavingKey("");
    }
  }

  return <section className="workspace-panel">
    <div className="workspace-panel-heading">
      <div><p className="workspace-kicker">Administrator configuration</p><h1>System account mappings</h1><p>Connect routine SACCO operations to the ledger accounts configured in the Chart of Accounts.</p></div>
      <button className="button-secondary" type="button" onClick={loadMappings} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
    </div>
    <div className="workspace-warning">Cashiers do not choose ledger accounts for routine deposits, withdrawals, loan disbursements, or repayments. The system uses these mappings and rejects postings when a required account is missing, inactive, the wrong category/currency, or a parent account.</div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {notice && <p className="workspace-feedback" role="status">{notice}</p>}
    {loading ? <div className="workspace-empty"><strong>Loading system mappings…</strong></div> : mappings.map((mapping) => {
      const options = accounts.filter((account) =>
        account.category === mapping.category
        && account.normalBalance === mapping.normalBalance
        && account.currency === "ETB"
        && account.isActive !== false
        && account.accountType !== "group"
        && !parentIds.has(account._id)
        && (!account.reservedSystemKey || account.reservedSystemKey === mapping.key)
        && (!account.systemKey || account.systemKey === mapping.key)
        && (!selectedKeys[account._id] || selectedKeys[account._id] === mapping.key),
      );
      return <article className="system-mapping-row" key={mapping.key}>
        <div className="system-mapping-copy">
          <strong>{mapping.label}</strong>
          <span><b>{mapping.key}</b> · {mapping.category} · {mapping.normalBalance} normal balance · ETB</span>
          <small>{mapping.account ? `Current: ${mapping.account.code} — ${mapping.account.name}${mapping.source ? ` · ${mapping.source}` : ""}` : "Not configured — operations requiring this mapping will be blocked."}</small>
        </div>
        <label className="workspace-field">
          <span>Ledger account</span>
          <select value={selections[mapping.key] || ""} disabled={savingKey === mapping.key} onChange={(event) => setSelections((current) => ({ ...current, [mapping.key]: event.target.value }))}>
            <option value="">Select active leaf {mapping.category} ({mapping.normalBalance}) account</option>
            {options.map((account) => <option key={account._id} value={account._id}>{account.code} — {account.name}</option>)}
          </select>
        </label>
        <button className="button-primary" type="button" disabled={loading || savingKey === mapping.key || !selections[mapping.key] || selections[mapping.key] === mapping.account?._id} onClick={() => saveMapping(mapping)}>{savingKey === mapping.key ? "Saving…" : "Save mapping"}</button>
      </article>;
    })}
    {!loading && <p className="workspace-inline-note">Mappings are unique: one ledger account cannot serve multiple system roles. Mapping changes are audited and take effect on subsequent transactions.</p>}
  </section>;
}
