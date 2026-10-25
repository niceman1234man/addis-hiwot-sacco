import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export function createPasswordResetToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash, expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) };
}

export function hashPasswordResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
