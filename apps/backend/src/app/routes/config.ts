import { FastifyInstance } from 'fastify';
import type { LlmConfigDto } from '@plant-doctor/api-types';
import { config } from '../../config';

/**
 * Read-only live backend config, exposed so the dashboard can show what's
 * currently loaded (e.g. the LLM model name on the Eval page). Gated by the
 * api-key plugin like every other non-health route, and returns only
 * non-sensitive values — never keys, URLs, or credentials.
 */
export default async function (fastify: FastifyInstance) {
  fastify.get('/config/llm', async function (): Promise<LlmConfigDto> {
    return { model: config.llmApiModel };
  });
}