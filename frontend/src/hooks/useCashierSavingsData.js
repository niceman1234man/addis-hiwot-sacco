import { useEffect, useState } from "react";
import { savingsApi } from "../api/savingsApi.js";

export function useCashierSavingsData() {
  const [members, setMembers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([savingsApi.eligibleMembers(), savingsApi.list("?status=active&limit=100")])
      .then(([memberResult, accountResult]) => {
        if (!active) return;
        setMembers(memberResult.members || []);
        setAccounts(accountResult.accounts || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || "Members and savings accounts could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { members, accounts, loading, error };
}
