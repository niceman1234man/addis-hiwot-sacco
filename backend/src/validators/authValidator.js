export function validateLogin(body = {}) {
  const errors = {};
  if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (typeof body.password !== "string" || body.password.length === 0 || body.password.length > 128) {
    errors.password = "Enter a password no longer than 128 characters.";
  }
  return { valid: Object.keys(errors).length === 0, errors, message: Object.values(errors).join(" ") };
}