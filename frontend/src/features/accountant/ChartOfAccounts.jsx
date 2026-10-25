import { useCallback, useEffect, useState } from "react";
import { accountingApi } from "../../api/accountingApi.js";
import Table from "../../components/common/Table.jsx";

export default function ChartOfAccounts({ readOnly = false }) {
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [mappingTemplateLoading, setMappingTemplateLoading] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const emptyValues = { code: "", name: "", category: "asset", accountType: "posting", normalBalance: "debit", subcategory: "", parent: "", description: "", currency: "ETB", systemKey: "", allowManualPosting: true };
  const [values, setValues] = useState(emptyValues);
  const setField = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));
  const accountIsSystemMapped = (accountId) => accounts.some((account) => account._id === accountId && (account.isSystemMapped || account.isSystem || account.systemKey));
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
      const payload = { ...values, parent: values.parent || null, systemKey: values.systemKey || undefined };
      const result = editingId
        ? await accountingApi.updateAccount(editingId, payload)
        : await accountingApi.createAccount(payload);
      setNotice(result.message || (editingId ? "Account updated." : "Account created."));
      setValues(emptyValues);
      setEditingId("");
      await loadAccounts();
    } catch (saveError) {
      setError(saveError.message || "Account could not be created.");
    } finally {
      setSaving(false);
    }
  }

  function editAccount(account) {
    setEditingId(account._id);
    setValues({
      code: account.code,
      name: account.name,
      category: account.category,
      accountType: account.accountType || (account.allowManualPosting === false || accounts.some((item) => (item.parent?._id || item.parent) === account._id) ? "group" : "posting"),
      normalBalance: account.normalBalance || (["asset", "expense"].includes(account.category) ? "debit" : "credit"),
      subcategory: account.subcategory || "",
      parent: account.parent?._id || "",
      description: account.description || "",
      currency: account.currency,
      systemKey: account.systemKey || "",
      allowManualPosting: account.allowManualPosting !== false,
    });
    setError("");
    setNotice("");
  }

  async function toggleActive(account) {
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.updateAccount(account._id, { isActive: !account.isActive });
      setNotice(result.message || `Account ${account.isActive ? "deactivated" : "activated"}.`);
      await loadAccounts();
    } catch (updateError) {
      setError(updateError.message || "Account status could not be changed.");
    }
  }

  async function deleteAccount(account) {
    const confirmed = window.confirm(`Permanently delete ${account.code} — ${account.name}? Only unused accounts can be deleted. Accounts with journal history, mappings, children, or expense references must be deactivated instead.`);
    if (!confirmed) return;
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.deleteAccount(account._id);
      setNotice(result.message || "Account deleted.");
      if (editingId === account._id) {
        setEditingId("");
        setValues(emptyValues);
      }
      await loadAccounts();
    } catch (deleteError) {
      setError(deleteError.message || "Account could not be deleted. If it has history, deactivate it instead.");
    }
  }

  async function createExampleChart() {
    const confirmed = window.confirm("Create the sample SACCO chart (1000–5002)? Existing accounts will not be overwritten. System mappings are configured separately after the chart is created.");
    if (!confirmed) return;
    setTemplateLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.createExampleChart();
      setNotice(result.message || "Starter chart created. Configure system account mappings next.");
      await loadAccounts();
    } catch (templateError) {
      setError(templateError.message || "The sample chart could not be created. No partial accounts were saved.");
    } finally {
      setTemplateLoading(false);
    }
  }

  async function configureExampleMappings() {
    const confirmed = window.confirm("Configure sample mappings to 1101 Cash, 1102 Bank, 1103 Mobile Money, 2001 Savings, 3001 Share Capital, 1201 Loan Receivable, 4001 Interest Income, 4002 Fees, and 5002 Office Rent? Existing mappings will not be overwritten.");
    if (!confirmed) return;
    setMappingTemplateLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.configureExampleMappings();
      const skippedSummary = result.skipped?.length ? ` ${result.skipped.length} mapping(s) left unchanged; review Admin → System account mappings.` : "";
      setNotice(`${result.message || "Sample system mappings configured."}${skippedSummary}`);
    } catch (mappingError) {
      setError(mappingError.message || "Sample mappings could not be configured.");
    } finally {
      setMappingTemplateLoading(false);
    }
  }

  const visibleAccounts = accounts.filter((account) => {
    const matchesSearch = `${account.code} ${account.name} ${account.subcategory || ""}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch
      && (!categoryFilter || account.category === categoryFilter)
      && (statusFilter === "all" || account.isActive === (statusFilter === "active"));
  });
  const parentOptions = accounts.filter((account) => account.isActive && !account.isSystemMapped && !account.isSystem && !account.systemKey && (account.accountType === "group" || accounts.some((item) => (item.parent?._id || item.parent) === account._id) || account.allowManualPosting === false) && account.category === values.category && account._id !== editingId && !accounts.some((item) => (item.parent?._id || item.parent) === editingId && item._id === account._id));
  const accountDepth = (account) => {
    let depth = 0;
    let parentId = account.parent?._id || account.parent;
    while (parentId && depth < 20) {
      const parent = accounts.find((item) => item._id === parentId);
      if (!parent) break;
      depth += 1;
      parentId = parent.parent?._id || parent.parent;
    }
    return depth;
  };

  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Accounting</p><h1>Chart of accounts</h1><p>Create account classifications and system ledger accounts.</p></div><button className="button-secondary" type="button" onClick={loadAccounts} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
    <div className="workspace-warning">Four-digit account codes use the first digit for classification: 1 Assets, 2 Liabilities, 3 Equity, 4 Income, 5 Expenses. Parent/group accounts organize the chart and cannot receive postings; child accounts hold ledger balances.</div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {notice && <p className="workspace-feedback" role="status">{notice}</p>}
    {!readOnly && <div className="chart-setup-actions"><div className="workspace-form-actions chart-template-actions"><button className="button-secondary" type="button" onClick={createExampleChart} disabled={templateLoading || loading}>{templateLoading ? "Creating sample chart…" : "Create sample SACCO chart"}</button><span>Creates the example parent groups and posting accounts for assets, liabilities, equity, income, and expenses. Existing accounts are never overwritten.</span></div><div className="workspace-form-actions chart-template-actions"><button className="button-secondary" type="button" onClick={configureExampleMappings} disabled={mappingTemplateLoading || loading}>{mappingTemplateLoading ? "Configuring sample mappings…" : "Configure sample system mappings"}</button><span>After the chart exists, maps cash 1101, bank 1102, mobile money 1103, savings 2001, share capital 3001, loan 1201, interest 4001, fees 4002, and default expense 5002. Existing mappings are never overwritten.</span></div></div>}
    {!readOnly && <form className="workspace-form account-create-form" onSubmit={createAccount}>
      <h2>{editingId ? "Edit account" : "Create account"}</h2>
      <div className="workspace-fields">
        <label className="workspace-field"><span>Account code *</span><input required pattern="[1-5][0-9]{3}" title="Use exactly four digits, beginning with 1–5 for the account category." maxLength={4} inputMode="numeric" value={values.code} onChange={setField("code")} placeholder={values.accountType === "group" ? "1000" : "1001"} disabled={Boolean(editingId)} /><small>Unique four-digit code; first digit must match the category.</small></label>
        <label className="workspace-field"><span>Account name *</span><input required maxLength={120} value={values.name} onChange={setField("name")} placeholder="Cash on Hand" /></label>
        <label className="workspace-field"><span>Category *</span><select value={values.category} onChange={setField("category")} disabled={Boolean(editingId)}><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity / Capital</option><option value="income">Income</option><option value="expense">Expense</option></select></label>
        <label className="workspace-field"><span>Account type *</span><select value={values.accountType} onChange={(event) => setValues((current) => ({ ...current, accountType: event.target.value, allowManualPosting: event.target.value === "posting" }))} disabled={Boolean(editingId && (accounts.some((account) => (account.parent?._id || account.parent) === editingId) || accountIsSystemMapped(editingId)))}><option value="group">Parent / Group Account</option><option value="posting">Posting / Ledger Account</option></select><small>{accounts.some((account) => (account.parent?._id || account.parent) === editingId) ? "This account has children, so it must remain a non-posting group." : accountIsSystemMapped(editingId) ? "This account is used by automated transactions; change its system mapping before changing its type." : "Unused leaf accounts can switch between group and posting types. Groups cannot receive transactions."}</small></label>
        <label className="workspace-field"><span>Normal balance *</span><select required value={values.normalBalance} onChange={setField("normalBalance")} disabled={Boolean(editingId && accountIsSystemMapped(editingId))}><option value="debit">Debit</option><option value="credit">Credit</option></select><small>{accountIsSystemMapped(editingId) ? "System-mapped account normal balance is protected; create or map a compatible account instead." : "Defaults: debit for assets/expenses; credit for liabilities/equity/income."}</small></label>
        <label className="workspace-field"><span>Subcategory</span><input maxLength={80} value={values.subcategory} onChange={setField("subcategory")} placeholder="Cash and Cash Equivalents" /></label>
        <label className="workspace-field"><span>Parent account</span><select value={values.parent} onChange={setField("parent")}><option value="">None — top-level account</option>{parentOptions.map((account) => <option key={account._id} value={account._id}>{account.code} — {account.name}</option>)}</select><small>Choose a same-category Parent / Group account. Groups can contain nested groups or posting accounts.</small></label>
        <label className="workspace-field workspace-field-wide"><span>Description</span><textarea maxLength={500} value={values.description} onChange={setField("description")} placeholder="Accounting purpose and usage notes" /></label>
        {values.accountType === "posting" && <label className="workspace-field account-checkbox"><input type="checkbox" checked={values.allowManualPosting} disabled={Boolean(editingId && accountIsSystemMapped(editingId))} onChange={(event) => setValues((current) => ({ ...current, allowManualPosting: event.target.checked }))} /><span>Allow manual journal posting</span></label>}
      </div>
      <div className="workspace-form-actions"><button className="button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Create account"}</button>{editingId && <button className="button-secondary" type="button" onClick={() => { setEditingId(""); setValues(emptyValues); }}>Cancel</button>}</div>
    </form>}
    {readOnly && <div className="workspace-warning" role="note">Chart accounts are configured by an administrator. Contact the admin to add or change accounts.</div>}
    <div className="account-list-controls">
      <label className="workspace-field"><span>Search accounts</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, name, subcategory" /></label>
      <label className="workspace-field"><span>Category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option><option value="asset">Assets</option><option value="liability">Liabilities</option><option value="equity">Equity / Capital</option><option value="income">Income</option><option value="expense">Expenses</option></select></label>
      <label className="workspace-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All</option></select></label>
    </div>
    {visibleAccounts.length > 0 ? <Table getRowKey={(account) => account._id} columns={[{ key: "code", label: "Code" }, { key: "name", label: "Account name", render: (account) => { const group = account.accountType === "group" || accounts.some((item) => (item.parent?._id || item.parent) === account._id); return <span className={`account-tree-name${group ? " is-group" : ""}`} style={{ "--account-depth": accountDepth(account) }}>{account.name}</span>; } }, { key: "accountType", label: "Account type", render: (account) => account.accountType === "group" || accounts.some((item) => (item.parent?._id || item.parent) === account._id) ? "Parent / Group" : "Posting / Ledger" }, { key: "category", label: "Category", render: (account) => account.category === "equity" ? "Equity / Capital" : account.category }, { key: "normalBalance", label: "Normal balance", render: (account) => account.normalBalance || "—" }, { key: "subcategory", label: "Subcategory", render: (account) => account.subcategory || "—" }, { key: "parent", label: "Parent", render: (account) => account.parent ? `${account.parent.code} — ${account.parent.name}` : "—" }, { key: "systemKey", label: "Posting key", render: (account) => account.systemKey || account.mappedSystemKey || "—" }, { key: "currency", label: "Currency" }, { key: "manualPosting", label: "Manual posting", render: (account) => account.accountType === "group" || account.allowManualPosting === false ? "No" : "Yes" }, { key: "status", label: "Status", render: (account) => account.isActive ? "Active" : "Inactive" }, { key: "createdAt", label: "Created", render: (account) => account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—" }, ...(!readOnly ? [{ key: "actions", label: "Actions", render: (account) => <div className="account-row-actions"><button type="button" className="text-button" onClick={() => editAccount(account)}>Edit</button><button type="button" className="text-button" onClick={() => toggleActive(account)}>{account.isActive ? "Deactivate" : "Activate"}</button><button type="button" className="text-button delete-account-button" onClick={() => deleteAccount(account)}>Delete</button></div> }] : [])]} rows={visibleAccounts} /> : !loading && <div className="workspace-empty"><strong>{accounts.length ? "No matching accounts" : "No accounts configured"}</strong><span>{accounts.length ? "Adjust search or filters to view accounts." : "Create the required chart of accounts before financial posting."}</span></div>}
  </section>;
}