import type {
  LlmPlantAnalysisResult,
  LlmStressSignResult,
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
      recommendations: { type: 'string' },
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
      detectedRegions: { type: 'integer' },
    },
    required: [
      'identifiedPlantName',
      'scientificName',
      'identificationConfidence',
      'likelyStressors',
      'summary',
      'recommendations',
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

export function parsePlantAnalysis(content: string): LlmPlantAnalysisResult {
  const parsed = extractJsonObject(content);

  if (!isRecord(parsed)) {
    throw new Error('LLM response JSON was not an object');
  }

  const stressSigns = Array.isArray(parsed.stressSigns)
    ? parsed.stressSigns
        .map((item) => normalizeStressSign(item))
        .filter((item): item is LlmStressSignResult => Boolean(item))
    : [];

  return {
    identifiedPlantName:
      normalizePlantName(
        stringValue(parsed.identifiedPlantName, 'Unknown plant'),
      ) || 'Unknown plant',
    scientificName:
      typeof parsed.scientificName === 'string' ? parsed.scientificName : null,
    identificationConfidence: numberOrNull(parsed.identificationConfidence),
    likelyStressors: Array.isArray(parsed.likelyStressors)
      ? parsed.likelyStressors
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : [],
    summary: stringValue(parsed.summary, 'No summary returned.'),
    recommendations: stringValue(
      parsed.recommendations,
      'No recommendations returned.',
    ),
    stressSigns,
    detectedRegions: numberOrNull(parsed.detectedRegions) ?? 0,
  };
}

export async function callPlantAnalysisLlm({
  prompt,
  image,
}: AnalyzePlantImageParams): Promise<LlmCallResult> {
  if (!config.llmApiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  const startedAt = Date.now();
  const body = {
    model: config.llmApiModel,
    temperature: 0.2,
    max_tokens: config.llmMaxTokens,
    response_format: {
      type: 'json_schema',
      json_schema: PLANT_ANALYSIS_SCHEMA,
    },
    messages: [
      {
        role: 'system',
        content:
          'You are Plant Doctor, a houseplant health analysis assistant. You analyze plant images and return structured JSON. You must return your analysis as a single JSON object. Ensure the JSON is complete and follows the requested schema.',
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
