import type {
  LlmDetectedRegion,
  LlmPlantAnalysisResult,
  LlmStressSignResult,
  ReasoningEffort,
  StressSeverity,
  StressSignStatus,
} from '@plant-doctor/api-types';
import {
  stressSeverityLevels,
  stressSignStatuses,
} from '@plant-doctor/api-types';
import { config } from '../../config';

interface AnalyzePlantImageParams {
  prompt: string;
  image: {
    buffer: Buffer;
    mimeType: string;
  };
  /** Sampling temperature. Defaults to 0.05 when omitted. */
  temperature?: number;
  /** Fireworks/Qwen3 reasoning effort. Defaults to 'none' when omitted. */
  reasoningEffort?: ReasoningEffort;
}

const PLANT_ANALYSIS_SCHEMA = {
  name: 'plant_analysis',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      identifiedPlantName: {
        type: 'string',
        description:
          "A single concise common species name, e.g. 'Aloe vera', 'Pothos', 'Snake Plant'. No parentheses, qualifiers, or hedging like 'likely'.",
      },
      scientificName: { type: ['string', 'null'] },
      identificationConfidence: { type: ['number', 'null'] },
      likelyStressors: {
        type: 'array',
        items: { type: 'string' },
      },
      summary: { type: 'string' },
      stressSigns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stressSignId: { type: 'string' },
            status: { type: 'string', enum: ['present', 'absent', 'unknown'] },
            severity: {
              type: 'string',
              enum: ['none', 'mild', 'moderate', 'severe'],
            },
            confidence: { type: ['number', 'null'] },
            notes: { type: 'string' },
          },
          required: [
            'stressSignId',
            'status',
            'severity',
            'confidence',
            'notes',
          ],
          additionalProperties: false,
        },
      },
      detectedRegions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stressSignId: { type: 'string' },
            bbox: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
              },
              required: ['x', 'y', 'width', 'height'],
              additionalProperties: false,
            },
          },
          required: ['stressSignId', 'bbox'],
          additionalProperties: false,
        },
      },
    },
    required: [
      'identifiedPlantName',
      'scientificName',
      'identificationConfidence',
      'likelyStressors',
      'summary',
      'stressSigns',
      'detectedRegions',
    ],
    additionalProperties: false,
  },
};

interface LlmCallResult {
  content: string;
  responseMetadata: Record<string, unknown>;
  latencyMs: number;
}

function chatCompletionsUrl() {
  const trimmedUrl = config.llmApiUrl.replace(/\/$/, '');
  return trimmedUrl.endsWith('/chat/completions')
    ? trimmedUrl
    : `${trimmedUrl}/chat/completions`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

/**
 * Normalizes the LLM's plant-name output into a single concise species name:
 * strips parenthetical qualifiers (e.g. "Columnar Cactus (likely Echinopsis or
 * Cereus species)" → "Columnar Cactus") and collapses whitespace. This is a
 * guard on top of the prompt, which already asks for a concise name.
 */
function normalizePlantName(value: string): string {
  return value
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function statusValue(value: unknown): StressSignStatus {
  return stressSignStatuses.includes(value as StressSignStatus)
    ? (value as StressSignStatus)
    : 'unknown';
}

function severityValue(value: unknown): StressSeverity {
  return stressSeverityLevels.includes(value as StressSeverity)
    ? (value as StressSeverity)
    : 'none';
}

function extractJsonObject(content: string) {
  const withoutFence = content
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  // If it already looks like a pure JSON object, try parsing it directly
  if (withoutFence.startsWith('{') && withoutFence.endsWith('}')) {
    try {
      return JSON.parse(withoutFence) as unknown;
    } catch {
      // Fall through to more aggressive extraction
    }
  }

  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('LLM response did not contain a JSON object');
  }

  const candidate = withoutFence.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(candidate) as unknown;
  } catch {
    console.error('Failed to parse extracted JSON object:', candidate);
    throw new Error('LLM response contained an invalid JSON object');
  }
}

function normalizeStressSign(value: unknown): LlmStressSignResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const stressSignId = stringValue(value.stressSignId).trim();

  if (!stressSignId) {
    return null;
  }

  return {
    stressSignId,
    status: statusValue(value.status),
    severity: severityValue(value.severity),
    confidence: numberOrNull(value.confidence),
    notes: stringValue(value.notes),
  };
}

/**
 * Returns a normalized bbox fraction in [0, 1], or null if any edge is missing,
 * non-finite, or out of range. The LLM is asked for normalized fractions; we
 * drop (rather than clamp) malformed boxes so a hallucinated coordinate never
 * paints a bogus highlight.
 */
function normalizeBbox(value: unknown): { x: number; y: number; width: number; height: number } | null {
  if (!isRecord(value)) {
    return null;
  }
  const { x, y, width, height } = value;
  const coords = { x, y, width, height };
  const out: { x: number; y: number; width: number; height: number } = {} as {
    x: number; y: number; width: number; height: number;
  };
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    const v = coords[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
      return null;
    }
    out[key] = v;
  }
  return out;
}

function normalizeDetectedRegion(
  value: unknown,
  allowedStressSignIds?: Set<string>,
): LlmDetectedRegion | null {
  if (!isRecord(value)) {
    return null;
  }
  const stressSignId = stringValue(value.stressSignId).trim();
  if (!stressSignId) {
    return null;
  }
  if (allowedStressSignIds && !allowedStressSignIds.has(stressSignId)) {
    return null;
  }
  const bbox = normalizeBbox(value.bbox);
  if (!bbox) {
    return null;
  }
  return { stressSignId, bbox };
}

export function parsePlantAnalysis(
  content: string,
  options?: {
    /** Allowed `stress_variables` ids for `likelyStressors`. */
    allowedStressorIds?: Set<string>;
    /** Allowed `stress_signs` ids for `detectedRegions[].stressSignId`. */
    allowedStressSignIds?: Set<string>;
  },
): LlmPlantAnalysisResult {
  const parsed = extractJsonObject(content);

  if (!isRecord(parsed)) {
    throw new Error('LLM response JSON was not an object');
  }

  const stressSigns = Array.isArray(parsed.stressSigns)
    ? parsed.stressSigns
        .map((item) => normalizeStressSign(item))
        .filter((item): item is LlmStressSignResult => Boolean(item))
    : [];

  const { allowedStressorIds, allowedStressSignIds } = options ?? {};

  // Likely stressors: keep only strings, trim, lowercase, and — when the caller
  // passes the DB-derived stress-variable vocabulary — drop anything off-list so
  // the model can't invent free-text stressors. Dedupe preserving order.
  const likelyStressors = Array.isArray(parsed.likelyStressors)
    ? parsed.likelyStressors
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)
        .filter(
          (value) => !allowedStressorIds || allowedStressorIds.has(value),
        )
    : [];

  const seenStressors = new Set<string>();
  const dedupedStressors = likelyStressors.filter((value) => {
    if (seenStressors.has(value)) return false;
    seenStressors.add(value);
    return true;
  });

  const detectedRegions = Array.isArray(parsed.detectedRegions)
    ? parsed.detectedRegions
        .map((item) => normalizeDetectedRegion(item, allowedStressSignIds))
        .filter((item): item is LlmDetectedRegion => Boolean(item))
    : [];

  return {
    identifiedPlantName:
      normalizePlantName(
        stringValue(parsed.identifiedPlantName, 'Unknown plant'),
      ) || 'Unknown plant',
    scientificName:
      typeof parsed.scientificName === 'string' ? parsed.scientificName : null,
    identificationConfidence: numberOrNull(parsed.identificationConfidence),
    likelyStressors: dedupedStressors,
    summary: stringValue(parsed.summary, 'No summary returned.'),
    stressSigns,
    detectedRegions,
  };
}

export async function callPlantAnalysisLlm({
  prompt,
  image,
  temperature,
  reasoningEffort,
}: AnalyzePlantImageParams): Promise<LlmCallResult> {
  if (!config.llmApiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  const startedAt = Date.now();
  const body = {
    model: config.llmApiModel,
    temperature: temperature ?? 0.05,
    max_tokens: config.llmMaxTokens,
    // 'none' skips Qwen3's thinking block on Fireworks — the dominant cost of
    // the analysis call. 'low'|'medium'|'high' re-enables reasoning. Mutually
    // exclusive with the `thinking` object, which we do not send. Defaults to
    // 'none' when the caller (e.g. the non-eval analyze flow) omits it.
    reasoning_effort: reasoningEffort ?? 'none',
    response_format: {
      type: 'json_schema',
      json_schema: PLANT_ANALYSIS_SCHEMA,
    },
    messages: [
      {
        role: 'system',
        content:
          'You are Plant Doctor, a houseplant health analysis assistant. You analyze plant images and return structured JSON. You must return your analysis as a single JSON object. Output only the JSON object — no surrounding prose, explanation, or chain-of-thought. Ensure the JSON is complete and follows the requested schema.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${image.mimeType};base64,${image.buffer.toString(
                'base64',
              )}`,
              detail: 'auto',
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.llmTimeoutMs);

  try {
    const response = await fetch(chatCompletionsUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.llmApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const responseText = await response.text();
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      throw new Error(
        `LLM request failed with ${response.status}: ${responseText}`,
      );
    }

    const responseJson = JSON.parse(responseText) as Record<string, unknown>;
    const choices = Array.isArray(responseJson.choices)
      ? responseJson.choices
      : [];
    const firstChoice = choices[0];
    const message = isRecord(firstChoice) ? firstChoice.message : undefined;
    const content = isRecord(message) ? stringValue(message.content) : '';
    const reasoningContent = isRecord(message) ? stringValue(message.reasoning_content) : '';

    if (!content) {
      console.error('LLM response missing content. Full response:', JSON.stringify(responseJson, null, 2));
      throw new Error('LLM response did not include message content');
    }

    if (content.trim() === '{}') {
      console.warn('LLM returned an empty JSON object. reasoning_content:', reasoningContent);
    }

    return {
      content,
      responseMetadata: responseJson,
      latencyMs,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
