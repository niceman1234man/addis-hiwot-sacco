export const ROLES = Object.freeze({
  ADMIN: "admin",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  CASHIER: "cashier",
});

// Kept for existing accounts created before role-specific access was introduced.
export const LEGACY_STAFF_ROLE = "staff";
export const ALL_ROLES = Object.freeze([...Object.values(ROLES), LEGACY_STAFF_ROLE]);
