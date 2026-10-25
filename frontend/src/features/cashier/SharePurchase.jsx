import { useEffect, useState } from "react";
import FinanceForm from "../../components/forms/FinanceForm.jsx";
import { savingsApi } from "../../api/savingsApi.js";
import { sharesApi } from "../../api/sharesApi.js";

export default function SharePurchase() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    savingsApi.eligibleMembers()
      .then((result) => { if (active) setMembers(result.members || []); })
      .catch((loadError) => { if (active) setError(loadError.message || "Eligible members could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const memberOptions = members.map((member) => ({
    value: member.id,
    label: `${member.memberNumber ? `${member.memberNumber} · ` : ""}${[member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ")}`,
  }));

  return <FinanceForm
    title="Share purchase"
    description="Record a member's share-capital contribution. Shares are separate from withdrawable savings."
    submitLabel="Post share purchase"
    warning={error || (loading ? "Loading eligible members…" : "The server posts cash/bank/mobile money against the configured members' share-capital equity account and records a receipt and journal atomically. Cash purchases require an open cashier session.")}
    fields={[
      { name: "memberId", label: "Member", type: "select", required: true, disabled: loading || !members.some((member) => member.eligible), options: memberOptions.map((option) => ({ ...option, disabled: !members.find((member) => member.id === option.value)?.eligible })) },
      { name: "amount", label: "Purchase amount (ETB)", type: "number", min: "0.01", step: "0.01", required: true },
      { name: "paymentMethod", label: "Payment method", type: "select", required: true, options: [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }] },
      { name: "description", label: "Notes", type: "textarea", wide: true, maxLength: 500 },
    ]}
    onSubmit={(values) => sharesApi.purchase({ ...values, amountMinor: Math.round(Number(values.amount) * 100), idempotencyKey: crypto.randomUUID() })}
  />;
}
