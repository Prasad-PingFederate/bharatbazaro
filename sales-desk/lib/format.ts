export function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function compact(n: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function hours(n: number) {
  if (n < 1) return "under an hour ago";
  if (n === 1) return "1 hour ago";
  return `${n} hours ago`;
}
