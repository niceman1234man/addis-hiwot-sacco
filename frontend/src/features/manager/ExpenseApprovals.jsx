import { useCallback, useEffect, useState } from "react";
import { accountingApi } from "../../api/accountingApi.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import Loader from "../../components/common/Loader.jsx";
import Table from "../../components/common/Table.jsx";

export default function ExpenseApprovals() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await accountingApi.expenses("?status=submitted");
      setExpenses(result.expenses || []);
    } catch (loadError) {
      setError(loadError.message || "Expenses could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(expense, decision) {
    const reason = decision === "rejected" ? window.prompt("Reason for rejection:") : "";
    if (decision === "rejected" && !reason?.trim()) return;
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.decideExpense(expense._id, { decision, reason });
      setNotice(result.message);
      await load();
    } catch (decisionError) {
      setError(decisionError.message || "Expense decision could not be saved.");
    }
  }

  const columns = [
    { key: "expenseNumber", label: "Expense" },
    { key: "description", label: "Description" },
    { key: "category", label: "Category" },
    { key: "amountMinor", label: "Amount", render: (item) => formatCurrency(item.amountMinor / 100, item.currency) },
    { key: "requestedBy", label: "Requested by", render: (item) => item.requestedBy?.name || "—" },
    { key: "actions", label: "Decision", render: (item) => <span className="expense-actions"><button type="button" onClick={() => decide(item, "approved")}>Approve</button><button type="button" onClick={() => decide(item, "rejected")}>Reject</button></span> },
  ];

  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Manager review</p><h1>Expense approvals</h1><p>Approve or reject claims before they can be paid.</p></div><button className="button-secondary" type="button" onClick={load} disabled={loading}>Refresh</button></div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {notice && <p className="workspace-feedback" role="status">{notice}</p>}
    {loading ? <Loader label="Loading expense claims…" /> : expenses.length ? <Table columns={columns} rows={expenses} /> : <div className="workspace-empty"><strong>No pending expense claims</strong><span>Submitted claims awaiting review will appear here.</span></div>}
  </section>;
}
