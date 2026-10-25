import { useState } from "react";
import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { savingsApi } from "../../api/savingsApi.js";
import { useCashierSavingsData } from "../../hooks/useCashierSavingsData.js";

const toMinor = (value) => Math.round(Number(value) * 100);
const memberName = (member) => [member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ");

export default function Deposit() {
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
      label: `${account.accountNumber} · ${account.productName} · Balance ${((account.availableBalanceMinor ?? account.balanceMinor) / 100).toFixed(2)} ETB`,
    }));

  return <FinanceForm title="Record a deposit" description="Select an active member savings account and record the funds received." submitLabel="Post deposit" warning={error || (loading ? "Loading eligible members and active savings accounts…" : "Deposits update the member balance and post to the configured cash, bank, or mobile-money asset and savings-liability accounts.") } fields={[
    { name: "memberId", label: "Member", type: "select", required: true, disabled: loading || !members.some((member) => member.eligible), options: memberOptions.map((option) => ({ ...option, disabled: !members.find((member) => member.id === option.value)?.eligible })), onChange: (value) => { setSelectedMember(value); return { savingsAccountId: "" }; } },
    { name: "savingsAccountId", label: "Active savings account", type: "select", required: true, disabled: loading || !selectedMember || savingsOptions.length === 0, options: savingsOptions, help: selectedMember && savingsOptions.length === 0 ? "This member has no active savings accounts." : "Only active accounts belonging to the selected member are shown." },
    { name: "amount", label: "Amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
    { name: "paymentMethod", label: "Payment method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }] },
    { name: "reference", label: "External reference" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ]} onSubmit={(values) => savingsApi.deposit({ ...values, amountMinor: toMinor(values.amount) })} />;
}
