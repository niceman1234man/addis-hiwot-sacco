// Standard monthly amortization estimate. The SACCO must approve the interest convention and fees before using it for live loans.
export function calculateAmortizedPaymentMinor(principalMinor, annualRateBps, termMonths) {
  if (!Number.isSafeInteger(principalMinor) || principalMinor <= 0) throw new TypeError("Principal must be a positive integer in minor units.");
  if (!Number.isSafeInteger(annualRateBps) || annualRateBps < 0 || annualRateBps > 10000) throw new TypeError("Annual rate must be an integer from 0 to 10000 basis points.");
  if (!Number.isSafeInteger(termMonths) || termMonths < 1 || termMonths > 600) throw new TypeError("Term must be from 1 to 600 months.");
  const monthlyRate = annualRateBps / 10000 / 12;
  if (monthlyRate === 0) return Math.round(principalMinor / termMonths);
  const payment = principalMinor * monthlyRate / (1 - (1 + monthlyRate) ** -termMonths);
  if (!Number.isSafeInteger(Math.round(payment))) throw new RangeError("Calculated payment exceeds safe integer range.");
  return Math.round(payment);
}

function addMonthsClamped(date, months) {
  const day = date.getUTCDate();
  const firstOfTarget = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
  firstOfTarget.setUTCDate(Math.min(day, lastDay));
  return firstOfTarget;
}

export function buildMonthlyAmortizationSchedule(principalMinor, annualRateBps, termMonths, disbursedAt = new Date()) {
  if (!(disbursedAt instanceof Date) || Number.isNaN(disbursedAt.getTime())) throw new TypeError("Disbursement date must be valid.");
  const paymentMinor = calculateAmortizedPaymentMinor(principalMinor, annualRateBps, termMonths);
  const monthlyRate = annualRateBps / 10000 / 12;
  let remainingPrincipalMinor = principalMinor;
  let totalInterestMinor = 0;
  const schedule = [];
  for (let month = 0; month < termMonths; month += 1) {
    const interestDueMinor = Math.round(remainingPrincipalMinor * monthlyRate);
    const principalDueMinor = month === termMonths - 1
      ? remainingPrincipalMinor
      : Math.min(remainingPrincipalMinor, paymentMinor - interestDueMinor);
    if (principalDueMinor <= 0) throw new RangeError("Loan terms would not amortize principal at the selected monthly payment.");
    remainingPrincipalMinor -= principalDueMinor;
    totalInterestMinor += interestDueMinor;
    if (!Number.isSafeInteger(totalInterestMinor)) throw new RangeError("Loan interest exceeds supported amount range.");
    schedule.push({
      dueAt: addMonthsClamped(disbursedAt, month + 1),
      principalDueMinor,
      interestDueMinor,
      principalPaidMinor: 0,
      interestPaidMinor: 0,
      status: "upcoming",
    });
  }
  return { paymentMinor, totalInterestMinor, totalDueMinor: principalMinor + totalInterestMinor, schedule };
}