import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { loansApi } from "../../api/loansApi.js";

export default function LoanApplicationForm() {
  return <FinanceForm title="Create a loan application" description="Capture the requested terms for a manager and accountant to review." submitLabel="Submit loan application" fields={[
    { name: "member", label: "Member ID", required: true },
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
