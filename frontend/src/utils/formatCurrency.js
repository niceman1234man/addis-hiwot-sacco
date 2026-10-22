export function formatCurrency(amount, currency = "ETB", locale = "en-ET") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}
