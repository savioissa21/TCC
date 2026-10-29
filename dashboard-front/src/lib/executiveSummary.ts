import type { EstablishmentSummary, ReviewStats } from "../types";

export const MIN_RELIABLE_ASPECT_MENTIONS = 10;

export interface ExecutiveSummaryData {
  priority: {
    aspect: string;
    score: number;
    mentions: number;
  } | null;
  coverage: {
    analyzed: number;
    googleTotal: number | null;
    percent: number | null;
  };
  recentMovement: {
    newReviews: number;
    latestSuccessAt: string | null;
  };
}

export function buildExecutiveSummary(
  stats: ReviewStats,
  stores: EstablishmentSummary[],
): ExecutiveSummaryData {
  const priorityAspect = [...stats.aspects]
    .filter((aspect) => aspect.total >= MIN_RELIABLE_ASPECT_MENTIONS)
    .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name, "pt-BR"))[0];

  const googleReviewCounts = stores
    .map((store) => store.googleReviewCount)
    .filter((count): count is number => typeof count === "number" && count > 0);
  const googleTotal = googleReviewCounts.length > 0
    ? googleReviewCounts.reduce((sum, count) => sum + count, 0)
    : null;
  const analyzed = Math.max(0, stats.total);
  const percent = googleTotal
    ? Math.min(100, Math.max(0, Math.round((analyzed / googleTotal) * 100)))
    : null;

  const validSuccessDates = stores
    .map((store) => store.lastMiningSuccessAt)
    .filter((value): value is string => Boolean(value) && !Number.isNaN(Date.parse(value as string)))
    .sort((left, right) => Date.parse(right) - Date.parse(left));

  return {
    priority: priorityAspect
      ? { aspect: priorityAspect.name, score: priorityAspect.score, mentions: priorityAspect.total }
      : null,
    coverage: { analyzed, googleTotal, percent },
    recentMovement: {
      newReviews: stores.reduce((sum, store) => sum + Math.max(0, store.lastNewReviews ?? 0), 0),
      latestSuccessAt: validSuccessDates[0] ?? null,
    },
  };
}
