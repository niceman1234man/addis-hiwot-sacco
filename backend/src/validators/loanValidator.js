export function validateLoan(body = {}) {
  const errors = {};
  const amount = Number(body.principalMinor);
  if (typeof body.member !== "string" || !/^[a-f\d]{24}$/i.test(body.member)) errors.member = "Provide a valid member ID.";
  if (!Number.isSafeInteger(amount) || amount <= 0) errors.principalMinor = "Loan principal must be a positive integer in minor currency units.";
  if (!Number.isSafeInteger(Number(body.interestRateBps)) || Number(body.interestRateBps) < 0 || Number(body.interestRateBps) > 10000) errors.interestRateBps = "Interest rate must be between 0 and 10000 basis points.";
  if (!Number.isSafeInteger(Number(body.termMonths)) || Number(body.termMonths) < 1 || Number(body.termMonths) > 600) errors.termMonths = "Loan term must be from 1 to 600 months.";
  if (typeof body.productName !== "string" || !body.productName.trim()) errors.productName = "Loan product is required.";
  if (typeof body.purpose !== "string" || !body.purpose.trim()) errors.purpose = "Loan purpose is required.";
  return { valid: Object.keys(errors).length === 0, errors, message: Object.values(errors).join(" ") };
}