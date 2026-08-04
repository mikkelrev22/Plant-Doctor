import type { LlmRequestMetricsDto, PlantReportEvalDto } from '@plant-doctor/api-types';

// Model-specific token prices in USD per 1,000,000 tokens. Keyed by the `model`
// string each eval run returns (llm_requests.model, which mirrors LLM_API_MODEL),
// so no new env var needs to reach the browser. The `default` entry is the
// fallback when a run's model isn't listed below — update it to match your
// current default model.
//
// Shape: { uncached: <input not from cache>, cached: <input from cache>, output }
// Values are $/1M tokens. Add the exact Fireworks/Qwen3 model ids you use here.
export const MODEL_PRICING: Record<
  string,
  {
    uncached: number;
    cached: number;
    output: number;
  }
> = {
  'accounts/fireworks/models/qwen3p7-plus': {
    uncached: 0.4,
    cached: 0.08,
    output: 1.6,
  },
  'qwen3.5:cloud': {
    uncached: 0.4,
    cached: 0.08,
    output: 1.6,
  },

  'accounts/fireworks/models/kimi-k2p6': {
    uncached: 0.95,
    cached: 0.16,
    output: 4,
  },
  'kimi-k2.6:cloud': {
    uncached: 0.95,
    cached: 0.16,
    output: 4,
  },

  'gemma4:31b-cloud': {
    uncached: 0.1,
    cached: 0.01,
    output: 0.4,
  },

  default: {
    uncached: 0.5,
    cached: 0.1,
    output: 2,
  },
};

export interface ModelPricing {
  uncached: number;
  cached: number;
  output: number;
}

export function getPricing(model: string | null | undefined): ModelPricing | null {
  if (!model) return MODEL_PRICING.default ?? null;
  return MODEL_PRICING[model] ?? MODEL_PRICING.default ?? null;
}

// Dollar cost for a single run, or null when pricing/token counts are missing.
// When cachedTokens is null (provider didn't report cache hits) all prompt
// tokens are priced as uncached input.
export function computeRunCost(metrics: LlmRequestMetricsDto | null): number | null {
  if (!metrics) return null;
  const pricing = getPricing(metrics.model);
  if (!pricing) return null;

  const prompt = metrics.promptTokens ?? null;
  const completion = metrics.completionTokens ?? null;
  if (prompt === null || completion === null) return null;

  const cached = metrics.cachedTokens ?? 0;
  const uncachedInput = Math.max(0, prompt - cached);
  const cachedInput = cached;

  return (
    (uncachedInput * pricing.uncached +
      cachedInput * pricing.cached +
      completion * pricing.output) /
    1_000_000
  );
}

// Total dollar cost across all runs in an eval. Runs with no cost contribute 0;
// returns null only if no run produced a cost.
export function computeTotalCost(reports: PlantReportEvalDto[]): number | null {
  let total = 0;
  let any = false;
  for (const report of reports) {
    const cost = computeRunCost(report.llmRequest);
    if (cost !== null) {
      any = true;
      total += cost;
    }
  }
  return any ? total : null;
}

// Format a dollar amount for the eval totals. For a cent or more we show cents
// ($0.05, $1.23). For a fraction of a cent we round to a single significant
// digit, e.g. $0.003468 → $0.003, $0.000468 → $0.0005. Returns '—' for null.
export function formatCost(value: number | null): string {
  if (value === null) return '—';
  if (value === 0) return '$0';
  if (value >= 0.01) return `$${value.toFixed(2)}`;

  // Fraction of a cent: round to 1 significant figure.
  const exp = Math.floor(Math.log10(value));
  const scale = Math.pow(10, exp);
  const rounded = Math.round(value / scale) * scale;
  return `$${rounded.toFixed(Math.max(0, -exp)).replace(/\.?0+$/, '')}`;
}