import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { loansApi } from "../../api/loansApi.js";

export default function LoanDisbursement() {
  return <FinanceForm title="Disburse an approved loan" description="Release funds only after manager approval." submitLabel="Disburse loan" warning="Disbursement requires a configured settlement account and creates a transaction plus a balanced journal entry." fields={[
    { name: "loanId", label: "Approved loan ID", required: true },
    { name: "paymentMethod", label: "Disbursement method", type: "select", required: true, options: [{ value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }, { value: "cash", label: "Cash (requires open cashier session)" }] },
  ]} onSubmit={(values) => loansApi.disburse(values.loanId, { paymentMethod: values.paymentMethod })} />;
}
