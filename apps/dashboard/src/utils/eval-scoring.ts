import type {
  PlantReportEvalDto,
  ReportStressSignDto,
  StressSignStatus,
} from '@plant-doctor/api-types';

type StatusCounts = Record<StressSignStatus, number>;

// Same canonical-column derivation as EvalResultsTable / ReportsTable: take the
// first report's stress signs and dedupe by id, so every run maps to the same
// column order regardless of which signs it returned.
export function deriveColumns(reports: PlantReportEvalDto[]): ReportStressSignDto[] {
  const first = reports[0]?.stressSigns ?? [];
  const seen = new Set<string>();
  return first.filter((sign) => {
    if (seen.has(sign.stressSignId)) return false;
    seen.add(sign.stressSignId);
    return true;
  });
}

// Weighted pairwise agreement score for one stress sign across runs, 0–100
// (or null when the sign was never evaluated). Unlike a plain modal share,
// this penalizes hard contradictions: a present↔absent pairing counts double
// (the sign can't genuinely be both there and not there), while any pairing
// involving 'unknown' counts single (uncertainty, not contradiction). So an
// 80% absent / 20% present split scores ~64%, but 80% absent / 20% unknown
// scores ~82% — the flipping pattern we want to surface reads worse.
export function signAgreementScore(
  counts: StatusCounts,
  evaluated: number,
): number | null {
  if (evaluated === 0) return null;
  if (evaluated === 1) return 100;
  const { present, absent, unknown } = counts;
  const penalty = 2 * present * absent + present * unknown + absent * unknown;
  const maxPenalty = evaluated * (evaluated - 1); // = 2 * C(evaluated, 2)
  const score = 1 - penalty / maxPenalty;
  return Math.round(score * 100);
}

// For each stress-sign column, the weighted agreement score across runs plus
// the present/absent/unknown breakdown for the tooltip. Considers only runs
// that evaluated the sign (had a stored row for it).
export function signConsistency(reports: PlantReportEvalDto[]) {
  const columns = deriveColumns(reports);
  return columns.map((column) => {
    const counts: StatusCounts = { present: 0, absent: 0, unknown: 0 };
    let evaluated = 0;
    for (const report of reports) {
      const sign = report.stressSigns.find(
        (s) => s.stressSignId === column.stressSignId,
      );
      if (!sign) continue;
      evaluated++;
      counts[sign.status]++;
    }
    return {
      column,
      score: signAgreementScore(counts, evaluated),
      counts,
      evaluated,
    };
  });
}

// Share of runs matching the most frequent value — the modal value is treated
// as the "truth" to compare against, which is more robust than anchoring on a
// single (possibly unrepresentative) first run. Null/empty values never become
// the truth and count as non-matches.
export function modalMatchPct(values: (string | null)[]): {
  pct: number | null;
  matchCount: number;
  modal: string | null;
} {
  if (values.length === 0) return { pct: null, matchCount: 0, modal: null };
  const counts = new Map<string, number>();
  for (const v of values) {
    if (v === null || v === '') continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let modal: string | null = null;
  let matchCount = 0;
  for (const [v, c] of counts) {
    if (c > matchCount) {
      modal = v;
      matchCount = c;
    }
  }
  if (modal === null) return { pct: null, matchCount: 0, modal: null };
  return { pct: Math.round((matchCount / values.length) * 100), matchCount, modal };
}

// Same idea as modalMatchPct but for stressor sets: each run's stressors are
// treated as a set, the most frequent set is the "truth", and the score is the
// share of runs whose set matches it.
export function modalSetMatchPct(sets: string[][]): {
  pct: number | null;
  matchCount: number;
} {
  if (sets.length === 0) return { pct: null, matchCount: 0 };
  const counts = new Map<string, number>();
  for (const s of sets) {
    const key = Array.from(new Set(s)).sort().join('|');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let matchCount = 0;
  for (const c of counts.values()) {
    if (c > matchCount) matchCount = c;
  }
  return { pct: Math.round((matchCount / sets.length) * 100), matchCount };
}

// Equal-weight average of the available consistency components (each 0–100 or
// null). Missing components are skipped, so the score degrades gracefully when
// e.g. no stress signs were evaluated.
export function overallScoreFrom(
  ...components: (number | null)[]
): number | null {
  const vals = components.filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// Mean per-stress-sign consistency (only signs that were evaluated count), or
// null when none were.
export function meanSignScore(reports: PlantReportEvalDto[]): number | null {
  const scores = signConsistency(reports)
    .map((c) => c.score)
    .filter((v): v is number => v !== null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// Overall consistency /100 for a plant's runs: equal-weight average of
// identification, stressor-set, and mean per-stress-sign consistency. Computed
// on the fly from the eval reports — not persisted.
export function computeOverallScore(reports: PlantReportEvalDto[]): number | null {
  if (reports.length === 0) return null;
  const idPct = modalMatchPct(reports.map((r) => r.identifiedPlantName)).pct;
  const stressorPct = modalSetMatchPct(reports.map((r) => r.likelyStressors)).pct;
  return overallScoreFrom(idPct, stressorPct, meanSignScore(reports));
}

// Color band shared by every consistency badge: 100 → teal, ≥80 → yellow,
// otherwise red. null → gray (not enough data).
export function consistencyColor(pct: number | null): string {
  if (pct === null) return 'gray';
  if (pct >= 95) return 'teal';
  if (pct >= 80) return 'yellow';
  return 'red';
}