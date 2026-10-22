import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { savingsApi } from "../../api/savingsApi.js";

export default function SavingsAccountForm() {
  return <FinanceForm title="Open a savings account" description="Prepare a savings account application for a verified member." submitLabel="Submit account request" fields={[
    { name: "member", label: "Member ID", required: true },
    { name: "productName", label: "Savings product", type: "select", required: true, options: [{ value: "regular", label: "Regular savings" }, { value: "youth", label: "Youth savings" }, { value: "special", label: "Special savings" }] },
    { name: "currency", label: "Currency", type: "select", required: true, defaultValue: "ETB", options: [{ value: "ETB", label: "ETB — Ethiopian birr" }] },
  ]} onSubmit={(values) => savingsApi.create({ member: values.member, productName: values.productName, currency: values.currency, initialDepositMinor: 0 })} />;
}
