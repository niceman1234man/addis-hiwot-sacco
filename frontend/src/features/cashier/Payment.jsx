import { useEffect, useState } from "react";
import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { loansApi } from "../../api/loansApi.js";
import { axiosInstance } from "../../api/axiosInstance.js";

const memberName = (member) => [member?.firstName, member?.middleName, member?.lastName].filter(Boolean).join(" ");

export default function Payment() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loansApi.list("?status=active&limit=100")
      .then((result) => { if (active) setLoans(result.loans || []); })
      .catch((loadError) => { if (active) setError(loadError.message || "Active loans could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const options = loans.map((loan) => ({
    value: loan._id,
    label: `${loan.loanNumber} · ${memberName(loan.member)} · Outstanding ${(loan.outstandingPrincipalMinor / 100).toFixed(2)} ETB`,
  }));

  return <FinanceForm title="Record a loan repayment" description="Select an active member loan and record a repayment. The server allocates principal and interest according to its schedule." submitLabel="Record repayment" warning={error || (loading ? "Loading active member loans…" : "Cash repayments require an open cashier session. The server allocates payment between principal and interest and creates a balanced journal entry.")} fields={[
    { name: "loan", label: "Active loan — member — outstanding principal", type: "select", required: true, disabled: loading, options },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "paymentMethod", label: "Payment method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }] },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => axiosInstance.post("/repayments", { loan: values.loan, paymentMethod: values.paymentMethod, notes: values.notes, amountMinor: Math.round(Number(values.amount) * 100) })} />;
}
