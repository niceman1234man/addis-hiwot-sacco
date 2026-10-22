import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { savingsApi } from "../../api/savingsApi.js";

export default function Withdrawal() {
  return <FinanceForm title="Record a withdrawal" description="Capture a member withdrawal request for verification." submitLabel="Submit withdrawal" fields={[
    { name: "memberId", label: "Member ID", required: true },
    { name: "savingsAccountId", label: "Savings account ID", required: true },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "paymentMethod", label: "Payout method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }] },
    { name: "identityVerified", label: "Identity check", type: "select", required: true, options: [{ value: "yes", label: "Verified" }, { value: "no", label: "Not verified" }] },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => savingsApi.withdraw({ ...values, identityVerified: values.identityVerified === "yes", amountMinor: Math.round(Number(values.amount) * 100) })} />;
}