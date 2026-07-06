const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number): string {
  return inr.format(value);
}

export function discountPercent(price: number, mrp?: number): number | null {
  if (!mrp || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

/** Rough no-cost-EMI figure shown on PDP (12 months). */
export function emiPerMonth(price: number, months = 12): number {
  return Math.ceil(price / months);
}
