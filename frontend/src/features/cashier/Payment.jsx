import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { axiosInstance } from "../../api/axiosInstance.js";

export default function Payment() {
  return <FinanceForm title="Record a loan repayment" description="Apply a member payment to an active loan. Repayment is allocated to principal first, then interest." submitLabel="Record repayment" fields={[
    { name: "loan", label: "Loan ID", required: true },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "paymentMethod", label: "Payment method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }] },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => axiosInstance.post("/repayments", { loan: values.loan, paymentMethod: values.paymentMethod, notes: values.notes, amountMinor: Math.round(Number(values.amount) * 100) })} />;
}