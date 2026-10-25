import { useEffect, useState } from "react";
import { savingsApi } from "../api/savingsApi.js";

export function useEligibleMembers() {
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

  const options = members.map((member) => ({
    value: member.id,
    label: `${member.memberNumber ? `${member.memberNumber} · ` : ""}${[member.firstName, member.middleName, member.lastName].filter(Boolean).join(" ")}`,
  }));

  return { members, options, loading, error };
}
