import { useEffect, useState } from "react";
import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { accountingApi } from "../../api/accountingApi.js";

export default function ExpenseForm() {
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [accountLoadError, setAccountLoadError] = useState("");

  useEffect(() => {
    let active = true;
    accountingApi.accounts("?active=true&category=expense")
      .then((result) => {
        if (active) {
          const accounts = result.accounts || [];
          const parentIds = new Set(accounts.map((account) => account.parent?._id || account.parent).filter(Boolean));
          setExpenseAccounts(accounts.filter((account) => account.isActive !== false && !parentIds.has(account._id)));
        }
      })
      .catch((error) => {
        if (active) setAccountLoadError(error.message || "Expense accounts could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  return <FinanceForm title="Submit an expense" description="Send an expense claim for manager approval. It is not paid until approved." submitLabel="Submit expense" warning={`Submitted expenses do not affect cash or ledgers until approved and paid.${accountLoadError ? ` ${accountLoadError}` : " Select a leaf expense account or leave it blank to use the configured default."}`} fields={[
    { name: "category", label: "Category", type: "select", required: true, options: [{ value: "office", label: "Office and supplies" }, { value: "utilities", label: "Utilities" }, { value: "travel", label: "Travel" }, { value: "staff", label: "Staff expense" }, { value: "other", label: "Other" }] },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "incurredAt", label: "Expense date", type: "date", required: true },
    { name: "paymentMethod", label: "Payment method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }, { value: "other", label: "Other" }] },
    { name: "account", label: "Expense ledger account", type: "select", options: [{ value: "", label: "Use configured default expense account" }, ...expenseAccounts.map((account) => ({ value: account._id, label: `${account.code} — ${account.name}` }))], help: "Optional. Select an active leaf account in the expense category." },
    { name: "vendorName", label: "Vendor / payee" },
    { name: "vendorReference", label: "Invoice reference" },
    { name: "description", label: "Description", type: "textarea", wide: true, required: true, maxLength: 1000 },
    { name: "notes", label: "Additional notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => accountingApi.createExpense({ ...values, account: values.account || undefined, amountMinor: Math.round(Number(values.amount) * 100) })} />;
}
