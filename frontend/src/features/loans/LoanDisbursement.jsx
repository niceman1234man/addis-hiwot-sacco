import { useEffect, useState } from "react";
import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { loansApi } from "../../api/loansApi.js";

const memberName = (member) => [member?.firstName, member?.middleName, member?.lastName].filter(Boolean).join(" ");

export default function LoanDisbursement() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loansApi.list("?status=approved&limit=100")
      .then((result) => { if (active) setLoans(result.loans || []); })
      .catch((loadError) => { if (active) setError(loadError.message || "Approved loans could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const options = loans.map((loan) => ({
    value: loan._id,
    label: `${loan.loanNumber} · ${memberName(loan.member)} · ${(loan.principalMinor / 100).toFixed(2)} ETB`,
  }));

  return <FinanceForm title="Disburse an approved loan" description="Select the approved member loan to release funds." submitLabel="Disburse loan" warning={error || (loading ? "Loading approved loans…" : "Disbursement requires a configured settlement account and creates a transaction plus a balanced journal entry. Cash disbursements require an open cashier session.")} fields={[
    { name: "loanId", label: "Approved loan — member — amount", type: "select", required: true, disabled: loading, options },
    { name: "paymentMethod", label: "Disbursement method", type: "select", required: true, options: [{ value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }, { value: "cash", label: "Cash (requires open cashier session)" }] },
  ]} onSubmit={(values) => loansApi.disburse(values.loanId, { paymentMethod: values.paymentMethod })} />;
}
