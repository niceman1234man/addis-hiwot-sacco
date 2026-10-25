import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { loansApi } from "../../api/loansApi.js";
import { useEligibleMembers } from "../../hooks/useEligibleMembers.js";

export default function LoanApplicationForm() {
  const { options, eligibleCount, loading, error } = useEligibleMembers();
  const guidance = eligibleCount === 0 ? "No approved active members are available. Pending members appear disabled; approve their applications under Admin → Member applications first." : "Loan applications are operational records only; no journal is posted until an approved loan is disbursed.";
  return <FinanceForm title="Create a loan application" description="Select a member, then capture the requested terms for review." submitLabel="Submit loan application" warning={error || (loading ? "Loading member list…" : guidance)} fields={[
    { name: "member", label: "Member", type: "select", required: true, disabled: loading || eligibleCount === 0, options },
    { name: "productName", label: "Loan product", type: "select", required: true, options: [{ value: "personal", label: "Personal loan" }, { value: "business", label: "Business loan" }, { value: "emergency", label: "Emergency loan" }] },
    { name: "principal", label: "Requested amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "interestRatePercent", label: "Annual rate (%)", type: "number", min: "0", max: "100", step: "0.01", required: true },
    { name: "termMonths", label: "Term (months)", type: "number", min: "1", max: "600", step: "1", required: true },
    { name: "purpose", label: "Purpose", type: "textarea", required: true, wide: true, maxLength: 1000 },
  ]} onSubmit={(values) => loansApi.create({
    member: values.member,
    productName: values.productName,
    principalMinor: Math.round(Number(values.principal) * 100),
    interestRateBps: Math.round(Number(values.interestRatePercent) * 100),
    termMonths: Number(values.termMonths),
    purpose: values.purpose,
  })} />;
}
