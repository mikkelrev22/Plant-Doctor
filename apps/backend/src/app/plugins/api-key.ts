import { timingSafeEqual } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { config } from '../../config';

/**
 * Static API-key gate — a stopgap until real authentication lands.
 *
 * The trusted frontends bundle the shared `BACKEND_API_KEY` and send it as the
 * `x-api-key` header. This keeps opportunists off the deployed API; it is NOT
 * authentication (the key is visible in the client JS bundles).
 *
 * - Fail-closed: if `config.apiKey` is empty, every gated request returns 401.
 * - Exempt: `OPTIONS` (CORS preflight carries no custom headers), `GET /`
 *   (health probe), and `/uploads/*` (browser `<img>` tags can't attach
 *   headers; in staging uploads are S3 public URLs anyway).
 * - Compared with `timingSafeEqual` to avoid a trivial timing oracle.
 *
 * @see https://fastify.dev/docs/latest/Reference/Hooks/#onrequest
 */
export default fp(async function apiKey(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return;

    const path = request.url.split('?')[0];
    if (path === '/' || path.startsWith('/uploads/')) return;

    // Read at request time so the value can be configured/reloaded via config.
    const expected = config.apiKey;
    const provided = request.headers['x-api-key'];

    const expectedBuf = Buffer.from(expected);
    const providedBuf =
      typeof provided === 'string' && provided.length > 0
        ? Buffer.from(provided)
        : null;

    if (
      !expected ||
      !providedBuf ||
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return reply
        .code(401)
        .send({ message: 'Unauthorized: missing or invalid API key' });
    }
  });
});