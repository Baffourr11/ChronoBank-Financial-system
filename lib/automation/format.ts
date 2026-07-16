export function formatGhs(amount: number, decimals = 0): string {
  return `GHS ${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function dayLabel(dayIndex: number): string {
  return DAY_NAMES[dayIndex] ?? "Unknown";
}
