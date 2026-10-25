import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { savingsApi } from "../../api/savingsApi.js";
import { useEligibleMembers } from "../../hooks/useEligibleMembers.js";

export default function SavingsAccountForm() {
  const { options, loading, error } = useEligibleMembers();
  return <FinanceForm title="Open a savings account" description="Select an approved member and prepare a savings account application." submitLabel="Submit account request" warning={error || (loading ? "Loading approved members…" : "Choose a member from the list. New savings accounts begin with a zero balance; record the first deposit separately.")} fields={[
    { name: "member", label: "Member", type: "select", required: true, disabled: loading, options },
    { name: "productName", label: "Savings product", type: "select", required: true, options: [{ value: "regular", label: "Regular savings" }, { value: "youth", label: "Youth savings" }, { value: "special", label: "Special savings" }] },
    { name: "currency", label: "Currency", type: "select", required: true, defaultValue: "ETB", options: [{ value: "ETB", label: "ETB — Ethiopian birr" }] },
  ]} onSubmit={(values) => savingsApi.create({ member: values.member, productName: values.productName, currency: values.currency, initialDepositMinor: 0 })} />;
}
