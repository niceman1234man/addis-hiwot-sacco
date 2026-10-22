export function validateMember(body = {}) {
  const errors = {};
  for (const field of ["firstName", "lastName", "phoneNumber1", "currentCityRegion", "subCityZone", "woreda"]) {
    if (typeof body[field] !== "string" || !body[field].trim()) errors[field] = `${field} is required.`;
  }
  if (!new Set(["female", "male", "other", "prefer_not_to_say"]).has(body.gender)) errors.gender = "Choose a valid gender option.";
  if (body.email && (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))) errors.email = "Enter a valid email address.";
  return { valid: Object.keys(errors).length === 0, errors, message: Object.values(errors).join(" ") };
}