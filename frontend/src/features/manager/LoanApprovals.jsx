import { useCallback, useEffect, useState } from "react";
import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { loansApi } from "../../api/loansApi.js";
import Table from "../../components/common/Table.jsx";
import Loader from "../../components/common/Loader.jsx";

export default function LoanApprovals() {
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await loansApi.list("?status=submitted");
      setLoans(response.loans || []);
    } catch (loadError) {
      setError(loadError.message || "Loan applications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function decide(values) {
    setResult("");
    setError("");
    try {
      const response = await loansApi.approve(values.loanId, { decision: values.decision, reason: values.reason });
      setResult(response?.message || "Approval request completed.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not submit the approval.");
      throw requestError;
    }
  }
  const columns = [
    { key: "loanNumber", label: "Loan" },
    { key: "member", label: "Member", render: (loan) => `${loan.member?.firstName || ""} ${loan.member?.lastName || loan.member?._id || ""}`.trim() },
    { key: "principalMinor", label: "Requested", render: (loan) => `${loan.currency} ${(loan.principalMinor / 100).toLocaleString()}` },
    { key: "productName", label: "Product" },
    { key: "purpose", label: "Purpose" },
  ];
  return <>
    <section className="workspace-panel"><div className="workspace-panel-heading"><div><p className="workspace-kicker">Review queue</p><h1>Submitted loans</h1><p>Applications awaiting an approval decision.</p></div><button className="button-secondary" type="button" onClick={load} disabled={loading}>Refresh</button></div>
      {loading ? <Loader label="Loading loan applications…" /> : loans.length ? <Table columns={columns} rows={loans} /> : <div className="workspace-empty"><strong>No loan applications awaiting review</strong><span>Submitted applications will appear here.</span></div>}
    </section>
    <FinanceForm title="Loan approval review" description="Submit an approval decision for an identified loan application." submitLabel="Submit decision" fields={[
      { name: "loanId", label: "Loan application ID", required: true },
      { name: "decision", label: "Decision", type: "select", required: true, options: [{ value: "approved", label: "Approve" }, { value: "rejected", label: "Reject" }] },
      { name: "reason", label: "Decision notes", type: "textarea", required: true, wide: true },
    ]} onSubmit={decide} />
    {result && <p className="workspace-feedback" role="status">{result}</p>}
    {error && <p className="workspace-feedback workspace-feedback-error" role="alert">{error}</p>}
  </>;
}