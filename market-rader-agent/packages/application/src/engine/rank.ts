import type { DimensionCode } from "@market-radar/contracts";

import type { CountryEvaluation, DimensionEvaluation, RankStability } from "./types.js";

const ALL_DIMENSIONS: readonly DimensionCode[] = [
  "market_size",
  "growth",
  "expansion",
  "digital",
  "customer_value",
  "entry_ease",
];

/**
 * Assigns ranks. Blocked and insufficient countries never enter the formal
 * ranking; provisional countries rank after published ones.
 */
export function rankCountries(evaluations: readonly CountryEvaluation[]): Map<string, number> {
  const rankable = evaluations
    .filter(
      (evaluation) =>
        (evaluation.resultStatus === "published" || evaluation.resultStatus === "provisional") &&
        evaluation.opportunityScoreBps !== null,
    )
    .sort((a, b) => {
      if (a.resultStatus !== b.resultStatus) {
        return a.resultStatus === "published" ? -1 : 1;
      }
      const delta = (b.opportunityScoreBps ?? 0) - (a.opportunityScoreBps ?? 0);
      if (delta !== 0) return delta;
      return a.countryId < b.countryId ? -1 : 1;
    });

  const ranks = new Map<string, number>();
  rankable.forEach((evaluation, index) => {
    ranks.set(evaluation.countryId, index + 1);
  });
  return ranks;
}

function dimensionScoresOf(
  evaluation: CountryEvaluation,
): Partial<Record<DimensionCode, number>> {
  const scores: Partial<Record<DimensionCode, number>> = {};
  for (const dimension of evaluation.dimensions) {
    if (dimension.status === "available" && dimension.scoreBps !== null) {
      scores[dimension.dimensionCode] = dimension.scoreBps;
    }
  }
  return scores;
}

function opportunityWithWeights(
  scores: Partial<Record<DimensionCode, number>>,
  weights: Readonly<Record<DimensionCode, number>>,
): number | null {
  const usable = ALL_DIMENSIONS.filter(
    (dimension) => scores[dimension] !== undefined && weights[dimension] > 0,
  );
  const totalWeight = usable.reduce((sum, dimension) => sum + weights[dimension], 0);
  if (totalWeight === 0) return null;
  return Math.round(
    usable.reduce(
      (sum, dimension) => sum + (weights[dimension] * (scores[dimension] ?? 0)) / totalWeight,
      0,
    ),
  );
}

/**
 * Rank stability via 12 weight perturbations (each dimension x0.9 / x1.1 with
 * renormalized remaining weights).
 */
export function computeRankStability(
  evaluations: readonly CountryEvaluation[],
  weights: Readonly<Record<DimensionCode, number>>,
): Map<string, RankStability> {
  const rankable = evaluations.filter(
    (evaluation) =>
      (evaluation.resultStatus === "published" || evaluation.resultStatus === "provisional") &&
      evaluation.opportunityScoreBps !== null,
  );
  const stability = new Map<string, RankStability>();
  if (rankable.length === 0) {
    for (const evaluation of evaluations) {
      stability.set(evaluation.countryId, "not_ranked");
    }
    return stability;
  }

  const baselineScores = new Map(rankable.map((e) => [e.countryId, dimensionScoresOf(e)]));

  const perturbations: Readonly<Record<DimensionCode, number>>[] = [];
  for (const dimension of ALL_DIMENSIONS) {
    for (const factor of [0.9, 1.1] as const) {
      const perturbed: Record<DimensionCode, number> = { ...weights };
      perturbed[dimension] = Math.round(weights[dimension] * factor);
      perturbations.push(perturbed);
    }
  }

  const baselineOrder = rankable
    .map((evaluation) => ({
      countryId: evaluation.countryId,
      score: opportunityWithWeights(baselineScores.get(evaluation.countryId)!, weights),
    }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.countryId < b.countryId ? -1 : 1))
    .map((entry) => entry.countryId);
  const baselineTop3 = new Set(baselineOrder.slice(0, 3));

  for (const evaluation of rankable) {
    const countryId = evaluation.countryId;
    let rankChanges = 0;
    let minTop3Retention = 1;

    for (const perturbedWeights of perturbations) {
      const order = rankable
        .map((candidate) => ({
          countryId: candidate.countryId,
          score: opportunityWithWeights(
            baselineScores.get(candidate.countryId)!,
            perturbedWeights,
          ),
        }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.countryId < b.countryId ? -1 : 1))
        .map((entry) => entry.countryId);

      const perturbedRank = order.indexOf(countryId) + 1;
      const baselineRank = baselineOrder.indexOf(countryId) + 1;
      if (perturbedRank !== baselineRank) rankChanges += 1;

      const perturbedTop3 = new Set(order.slice(0, 3));
      const retained = [...baselineTop3].filter((id) => perturbedTop3.has(id)).length;
      minTop3Retention = Math.min(minTop3Retention, retained / Math.min(3, baselineTop3.size));
    }

    if (rankChanges === 0 && minTop3Retention >= 0.9) {
      stability.set(countryId, "stable");
    } else if (rankChanges <= 2 && minTop3Retention >= 0.7) {
      stability.set(countryId, "moderately_sensitive");
    } else {
      stability.set(countryId, "highly_sensitive");
    }
  }

  for (const evaluation of evaluations) {
    if (!stability.has(evaluation.countryId)) {
      stability.set(evaluation.countryId, "not_ranked");
    }
  }
  return stability;
}

export type { DimensionEvaluation };
