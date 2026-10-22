import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { axiosInstance } from "../../api/axiosInstance.js";

export default function CashClosing() {
  return <FinanceForm title="Cash session closing" description="Enter the physical cash count for an open cashier session." submitLabel="Submit closing count" fields={[
    { name: "sessionId", label: "Cash session ID", required: true },
    { name: "countedClosing", label: "Counted cash (ETB)", type: "number", min: "0", step: "0.01", required: true },
    { name: "closingNotes", label: "Variance notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => axiosInstance.post("/cashier/sessions/close", { ...values, countedClosingMinor: Math.round(Number(values.countedClosing) * 100) })} />;
}