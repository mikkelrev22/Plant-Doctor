import * as fs from 'fs/promises';
import * as path from 'path';
import { FastifyInstance } from 'fastify';

/**
 * Persists the hand-edited architecture diagram.
 *
 * The browser app (apps/architecture, port 4600) loads and saves the graph
 * here so the diagram lives in a committable file: docs/architecture.json.
 *
 * GET  /architecture/graph  -> returns { nodes, edges } (empty arrays if the
 *                              file does not exist yet)
 * PUT  /architecture/graph   -> overwrites the file with the provided body
 */
export default async function (fastify: FastifyInstance) {
  const graphFile = path.resolve(process.cwd(), 'docs', 'architecture.json');

  fastify.get('/architecture/graph', async function () {
    try {
      const raw = await fs.readFile(graphFile, 'utf8');
      const body = JSON.parse(raw);
      return {
        nodes: Array.isArray(body.nodes) ? body.nodes : [],
        edges: Array.isArray(body.edges) ? body.edges : [],
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return { nodes: [], edges: [] };
      }
      throw err;
    }
  });

  fastify.put('/architecture/graph', async function (request, reply) {
    const body = request.body as unknown;
    if (
      !body ||
      typeof body !== 'object' ||
      !Array.isArray((body as { nodes?: unknown }).nodes) ||
      !Array.isArray((body as { edges?: unknown }).edges)
    ) {
      return reply.code(400).send({
        error: 'Body must be an object with `nodes` and `edges` arrays',
      });
    }

    const { nodes, edges } = body as { nodes: unknown[]; edges: unknown[] };
    await fs.mkdir(path.dirname(graphFile), { recursive: true });
    await fs.writeFile(
      graphFile,
      JSON.stringify({ nodes, edges }, null, 2) + '\n',
      'utf8'
    );
    return { ok: true, nodes: nodes.length, edges: edges.length };
  });
}