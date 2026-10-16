import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return { passwordSalt: salt.toString("hex"), passwordHash: hash.toString("hex") };
}

export async function verifyPassword(password, user) {
  const salt = user?.passwordSalt;
  const storedHash = user?.passwordHash;
  const validStoredHash =
    typeof salt === "string" &&
    typeof storedHash === "string" &&
    /^[\da-f]{32}$/i.test(salt) &&
    /^[\da-f]{128}$/i.test(storedHash);
  const saltBuffer = validStoredHash
    ? Buffer.from(salt, "hex")
    : Buffer.from("addis-hiwot-invalid-login-salt");
  const actualHash = await scrypt(password, saltBuffer, 64);

  if (!validStoredHash) {
    timingSafeEqual(actualHash, Buffer.alloc(64));
    return false;
  }

  return timingSafeEqual(actualHash, Buffer.from(storedHash, "hex"));
}
