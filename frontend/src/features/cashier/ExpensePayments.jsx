import { useCallback, useEffect, useState } from "react";
import { accountingApi } from "../../api/accountingApi.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import Loader from "../../components/common/Loader.jsx";
import Table from "../../components/common/Table.jsx";

export default function ExpensePayments() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await accountingApi.expenses("?status=approved");
      setExpenses(result.expenses || []);
    } catch (loadError) {
      setError(loadError.message || "Approved expenses could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function pay(expense) {
    if (!window.confirm(`Pay ${expense.expenseNumber} for ${formatCurrency(expense.amountMinor / 100, expense.currency)}?`)) return;
    setError("");
    setNotice("");
    try {
      const result = await accountingApi.payExpense(expense._id);
      setNotice(result.message);
      await load();
    } catch (payError) {
      setError(payError.message || "Expense could not be paid.");
    }
  }
  const columns = [
    { key: "expenseNumber", label: "Expense" },
    { key: "description", label: "Description" },
    { key: "amountMinor", label: "Amount", render: (item) => formatCurrency(item.amountMinor / 100, item.currency) },
    { key: "paymentMethod", label: "Method" },
    { key: "actions", label: "Payment", render: (item) => <button type="button" onClick={() => pay(item)}>Pay approved expense</button> },
  ];
  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Cashier payments</p><h1>Approved expenses</h1><p>Only manager-approved expenses are eligible for payment.</p></div><button className="button-secondary" type="button" onClick={load} disabled={loading}>Refresh</button></div>
    <div className="workspace-warning">Cash payments require an open cashier session and all payments are recorded in the ledger.</div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {notice && <p className="workspace-feedback" role="status">{notice}</p>}
    {loading ? <Loader label="Loading approved expenses…" /> : expenses.length ? <Table columns={columns} rows={expenses} /> : <div className="workspace-empty"><strong>No approved expenses to pay</strong><span>Approved expenses will appear here.</span></div>}
  </section>;
}
