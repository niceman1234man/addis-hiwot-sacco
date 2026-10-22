import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { transactionsApi } from "../../api/transactionsApi.js";
import Table from "../../components/common/Table.jsx";
import Loader from "../../components/common/Loader.jsx";
import { formatCurrency } from "../../utils/formatCurrency.js";

const columns = [
  { key: "reference", label: "Reference" },
  { key: "type", label: "Type", render: (row) => row.type?.replaceAll("_", " ") },
  { key: "amount", label: "Amount", render: (row) => formatCurrency(Number(row.amountMinor) / 100, row.currency || "ETB") },
  { key: "status", label: "Status", render: (row) => <span className={`account-status status-${row.status}`}>{row.status}</span> },
  { key: "createdAt", label: "Date", render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleString() : "—" },
];

export default function TransactionsList() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await transactionsApi.list();
      setTransactions(response.transactions || []);
    } catch (loadError) {
      setError(loadError.message || "Transactions could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <section className="workspace-panel">
    <div className="workspace-panel-heading"><div><p className="workspace-kicker">Operations</p><h1>Transactions</h1><p>Review transaction activity and posting status.</p></div><button className="button-secondary" type="button" disabled={loading} onClick={load}><RefreshCw size={14} /> Refresh</button></div>
    <div className="workspace-warning">Only posted entries affect financial reports. Transaction posting is not enabled in the current backend.</div>
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
    {loading ? <Loader label="Loading transactions…" /> : transactions.length ? <Table columns={columns} rows={transactions} /> : <div className="workspace-empty"><strong>No transaction records</strong><span>Transactions will appear here when the service is enabled.</span></div>}
  </section>;
}
