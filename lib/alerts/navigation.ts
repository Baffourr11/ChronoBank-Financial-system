/** ISO date YYYY-MM-DD */
export type TimelineDateParam = string;

export interface AlertNavigationPayload {
  navigateTo?: string;
  transactionDate?: string;
  date?: string;
  transactionId?: string;
  category?: string;
  amount?: number;
}

const TIMELINE_ALERT_TYPES = new Set([
  "budget_exceeded",
  "large_expense",
  "anomaly_detected",
  "automation",
  "transaction",
  "overspend",
]);

function normalizeDate(value: unknown): TimelineDateParam | null {
  if (value == null) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

export function extractAlertTimelineDate(
  data: AlertNavigationPayload | null | undefined,
): TimelineDateParam | null {
  if (!data) return null;
  return (
    normalizeDate(data.transactionDate) ??
    normalizeDate(data.date) ??
    null
  );
}

export function shouldNavigateAlertToTimeline(alert: {
  type?: string;
  data?: AlertNavigationPayload | null;
}): boolean {
  const data = alert.data ?? {};
  if (data.navigateTo === "timeline") return true;
  if (extractAlertTimelineDate(data)) return true;
  if (alert.type && TIMELINE_ALERT_TYPES.has(alert.type)) {
    return Boolean(extractAlertTimelineDate(data));
  }
  return false;
}

export function buildTimelineHref(alert: {
  type?: string;
  data?: AlertNavigationPayload | null;
}): string | null {
  const data = alert.data ?? {};
  const date = extractAlertTimelineDate(data);
  if (!date) {
    if (data.navigateTo === "timeline") {
      return "/timeline";
    }
    return null;
  }

  const params = new URLSearchParams({ date });
  if (data.transactionId) {
    params.set("highlight", String(data.transactionId));
  }
  return `/timeline?${params.toString()}`;
}
