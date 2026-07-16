import { ANALYTICS_CONFIG } from "@/lib/analytics/config";

export interface ImportDataRange {
  start?: string;
  end?: string;
  totalDays: number;
}

export interface ImportRecommendations {
  needsMoreData: boolean;
  recommendedMinTransactions: number;
  needsLongerHistory: boolean;
  recommendedMinDays: number;
}

export interface ImportDataQuality {
  totalTransactions?: number;
  hasEnoughData: boolean;
  hasHistoricalData: boolean;
  dataRange: ImportDataRange;
  recommendations: ImportRecommendations;
}

const DEFAULT_MIN_TX =
  ANALYTICS_CONFIG.PATTERN_DETECTION.MIN_DATA_POINTS;
const DEFAULT_MIN_DAYS = 90;

/** Normalize GET /api/data/import payload for any dataset size. */
export function normalizeImportStats(
  apiData: unknown,
): ImportDataQuality {
  const root =
    apiData && typeof apiData === "object"
      ? (apiData as Record<string, unknown>)
      : {};

  const statistics =
    root.statistics && typeof root.statistics === "object"
      ? (root.statistics as Record<string, unknown>)
      : {};

  const recSource =
    (root.recommendations && typeof root.recommendations === "object"
      ? root.recommendations
      : statistics.recommendations &&
          typeof statistics.recommendations === "object"
        ? statistics.recommendations
        : {}) as Record<string, unknown>;

  const rawRange =
    statistics.dataRange && typeof statistics.dataRange === "object"
      ? (statistics.dataRange as Record<string, unknown>)
      : {};

  const totalTransactions = Number(statistics.totalTransactions) || 0;
  const totalDays = Number(rawRange.totalDays) || 0;
  const hasEnoughData = Boolean(statistics.hasEnoughData);
  const hasHistoricalData = Boolean(statistics.hasHistoricalData);

  return {
    totalTransactions,
    hasEnoughData,
    hasHistoricalData,
    dataRange: {
      start:
        typeof rawRange.start === "string" ? rawRange.start : undefined,
      end: typeof rawRange.end === "string" ? rawRange.end : undefined,
      totalDays,
    },
    recommendations: {
      needsMoreData: Boolean(
        recSource.needsMoreData ?? totalTransactions < DEFAULT_MIN_TX,
      ),
      recommendedMinTransactions:
        Number(recSource.recommendedMinTransactions) || DEFAULT_MIN_TX,
      needsLongerHistory: Boolean(
        recSource.needsLongerHistory ?? totalDays < DEFAULT_MIN_DAYS,
      ),
      recommendedMinDays:
        Number(recSource.recommendedMinDays) || DEFAULT_MIN_DAYS,
    },
  };
}
