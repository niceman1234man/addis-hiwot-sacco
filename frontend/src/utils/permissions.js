export const ROLES = Object.freeze(["admin", "manager", "accountant", "cashier"]);

const permissionsByRole = Object.freeze({
  admin: ["users:manage", "members:manage", "reports:view", "settings:manage"],
  manager: ["loans:approve", "transactions:approve", "reports:view"],
  accountant: ["accounting:manage", "savings:manage", "loans:manage", "reports:view"],
  cashier: ["deposits:create", "withdrawals:create", "payments:create", "cash-sessions:manage"],
});

export function hasPermission(role, permission) {
  return permissionsByRole[role]?.includes(permission) ?? false;
}
