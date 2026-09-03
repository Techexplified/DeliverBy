export function formatMoney(amount, currencyCode = "USD") {
  if (!amount && amount !== 0) return "";
  const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]+/g, "")) : Number(amount);
  if (isNaN(num)) return String(amount);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode || "USD",
      minimumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    return `${currencyCode} ${num.toFixed(2)}`;
  }
}
