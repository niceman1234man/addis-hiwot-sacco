import { randomBytes } from "node:crypto";

export function generateReference(prefix = "AH") {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}