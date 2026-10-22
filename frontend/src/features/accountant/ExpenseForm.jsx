import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { accountingApi } from "../../api/accountingApi.js";

export default function ExpenseForm() {
  return <FinanceForm title="Submit an expense" description="Send an expense claim for manager approval. It is not paid until approved." submitLabel="Submit expense" warning="Submitted expenses do not change cash or ledgers until approved and paid." fields={[
    { name: "category", label: "Category", type: "select", required: true, options: [{ value: "office", label: "Office and supplies" }, { value: "utilities", label: "Utilities" }, { value: "travel", label: "Travel" }, { value: "staff", label: "Staff expense" }, { value: "other", label: "Other" }] },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "incurredAt", label: "Expense date", type: "date", required: true },
    { name: "paymentMethod", label: "Payment method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }, { value: "other", label: "Other" }] },
    { name: "vendorName", label: "Vendor / payee" },
    { name: "vendorReference", label: "Invoice reference" },
    { name: "description", label: "Description", type: "textarea", wide: true, required: true, maxLength: 1000 },
    { name: "notes", label: "Additional notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => accountingApi.createExpense({ ...values, amountMinor: Math.round(Number(values.amount) * 100) })} />;
}
