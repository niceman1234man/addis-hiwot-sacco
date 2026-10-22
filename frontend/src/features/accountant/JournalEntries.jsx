import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { axiosInstance } from "../../api/axiosInstance.js";

export default function JournalEntries() {
  return <FinanceForm title="Create journal entry" description="Prepare a two-sided journal entry for accounting review." submitLabel="Submit journal draft" fields={[
    { name: "description", label: "Description", required: true, maxLength: 500 },
    { name: "debitAccountId", label: "Debit account ID", required: true },
    { name: "debitAmount", label: "Debit amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "creditAccountId", label: "Credit account ID", required: true },
    { name: "creditAmount", label: "Credit amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "date", label: "Entry date", type: "date", required: true },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => axiosInstance.post("/accounting/journals", {
    description: values.description,
    date: values.date,
    notes: values.notes,
    lines: [
      { account: values.debitAccountId, debitMinor: Math.round(Number(values.debitAmount) * 100), creditMinor: 0 },
      { account: values.creditAccountId, debitMinor: 0, creditMinor: Math.round(Number(values.creditAmount) * 100) },
    ],
  })} />;
}