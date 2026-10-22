import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { savingsApi } from "../../api/savingsApi.js";

const toMinor = (value) => Math.round(Number(value) * 100);

export default function Deposit() {
  return <FinanceForm title="Record a deposit" description="Capture a member savings deposit for cashier review." submitLabel="Submit deposit" fields={[
    { name: "memberId", label: "Member ID", required: true },
    { name: "savingsAccountId", label: "Savings account ID", required: true },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "paymentMethod", label: "Payment method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }] },
    { name: "reference", label: "External reference" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => savingsApi.deposit({ ...values, amountMinor: toMinor(values.amount) })} />;
}