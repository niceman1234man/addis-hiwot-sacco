import { useState } from "react";
import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { savingsApi } from "../../api/savingsApi.js";
import { useCashierSavingsData } from "../../hooks/useCashierSavingsData.js";

const memberName = (member) => [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ");

export default function Withdrawal() {
  const { members, accounts, loading, error } = useCashierSavingsData();
  const [selectedMember, setSelectedMember] = useState("");
  const memberOptions = members.map((member) => ({
    value: member.id,
    label: `${member.memberNumber ? `${member.memberNumber} · ` : ""}${memberName(member)}`,
  }));
  const savingsOptions = accounts
    .filter((account) => String(account.member?._id || account.member) === selectedMember)
    .map((account) => ({
      value: account._id,
      label: `${account.accountNumber} · ${account.productName} · Available ${((account.availableBalanceMinor ?? account.balanceMinor) / 100).toFixed(2)} ETB`,
    }));

  return <FinanceForm title="Record a withdrawal" description="Select an active member savings account and verify identity before paying out." submitLabel="Post withdrawal" warning={error || (loading ? "Loading eligible members and active savings accounts…" : "Withdrawals reduce the member balance and post against the savings liability and selected settlement account. Cash payouts require an open cashier session.")} fields={[
    { name: "memberId", label: "Member", type: "select", required: true, disabled: loading, options: memberOptions, onChange: (value) => { setSelectedMember(value); return { savingsAccountId: "" }; } },
    { name: "savingsAccountId", label: "Active savings account", type: "select", required: true, disabled: loading || !selectedMember || savingsOptions.length === 0, options: savingsOptions, help: selectedMember && savingsOptions.length === 0 ? "This member has no active savings accounts." : "The available balance is shown; overdrafts are rejected by the server." },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "paymentMethod", label: "Payout method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }] },
    { name: "identityVerified", label: "Identity check", type: "select", required: true, options: [{ value: "yes", label: "Verified" }, { value: "no", label: "Not verified" }] },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => savingsApi.withdraw({ ...values, identityVerified: values.identityVerified === "yes", amountMinor: Math.round(Number(values.amount) * 100) })} />;
}
