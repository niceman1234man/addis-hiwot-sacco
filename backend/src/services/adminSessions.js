import { createHash, randomBytes } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "addis_hiwot_admin_session";
export const ADMIN_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  return [
    "Path=/api",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(ADMIN_SESSION_MAX_AGE_MS / 1000)}`,
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

function clearCookieOptions() {
  return [
    "Path=/api",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function getAdminSessionToken(request) {
  const cookieHeader = request.headers.cookie;
  if (typeof cookieHeader !== "string") return null;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`));
  const token = cookie?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return token && /^[\da-f]{64}$/i.test(token) ? token : null;
}

export async function startAdminSession(user, response) {
  const token = randomBytes(32).toString("hex");
  user.sessionTokenHash = hashSessionToken(token);
  user.sessionExpiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_MS);
  await user.save();
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=${token}; ${cookieOptions()}`);
}

export async function endAdminSession(user, response) {
  user.sessionTokenHash = null;
  user.sessionExpiresAt = null;
  await user.save();
  clearAdminSessionCookie(response);
}

export function clearAdminSessionCookie(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=; ${clearCookieOptions()}`);
}
