import { useCallback, useEffect, useState } from "react";
import { accountingApi } from "../../api/accountingApi.js";
import Table from "../../components/common/Table.jsx";

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({ code: "", name: "", category: "asset", currency: "ETB", systemKey: "" });
  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await accountingApi.accounts();
      setAccounts(response.accounts || []);
    } catch (loadError) {
      setError(loadError.message || "The chart of accounts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  async function createAccount(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.createAccount({ ...values, systemKey: values.systemKey || undefined });
      setNotice(result.message || "Account created.");
      setValues({ code: "", name: "", category: "asset", currency: "ETB", systemKey: "" });
      await loadAccounts();
    } catch (saveError) {
      setError(saveError.message || "Account could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Accounting</p><h1>Chart of accounts</h1><p>Create account classifications and system ledger accounts.</p></div><button className="button-secondary" type="button" onClick={loadAccounts} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
    <div className="workspace-warning">Configure these ETB system accounts before posting: cash, bank, mobile money, savings liability, loan receivable, interest income, and expense.</div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {notice && <p className="workspace-feedback" role="status">{notice}</p>}
    <form className="workspace-form account-create-form" onSubmit={createAccount}>
      <h2>Create account</h2>
      <div className="workspace-fields">
        <label className="workspace-field"><span>Account code *</span><input required maxLength={24} value={values.code} onChange={setField("code")} placeholder="1000-CASH" /></label>
        <label className="workspace-field"><span>Name *</span><input required maxLength={120} value={values.name} onChange={setField("name")} /></label>
        <label className="workspace-field"><span>Category *</span><select value={values.category} onChange={setField("category")}><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
        <label className="workspace-field"><span>System posting key</span><select value={values.systemKey} onChange={setField("systemKey")}><option value="">Regular account</option><option value="cash">Cash settlement</option><option value="bank">Bank settlement</option><option value="mobile_money">Mobile money settlement</option><option value="savings">Savings liability</option><option value="loan_receivable">Loan receivable</option><option value="interest_income">Interest income</option><option value="fees_income">Fees income</option><option value="expense">Expense account</option></select><small>System keys can only be assigned by an administrator.</small></label>
      </div>
      <div className="workspace-form-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Creating…" : "Create account"}</button></div>
    </form>
    {accounts.length > 0 ? <Table columns={[{ key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "category", label: "Category" }, { key: "systemKey", label: "Posting key", render: (account) => account.systemKey || "—" }, { key: "currency", label: "Currency" }]} rows={accounts} /> : !loading && <div className="workspace-empty"><strong>No accounts configured</strong><span>Create the required chart of accounts before financial posting.</span></div>}
  </section>;
}