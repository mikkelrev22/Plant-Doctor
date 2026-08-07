import * as path from 'path';
import { FastifyInstance } from 'fastify';
import AutoLoad from '@fastify/autoload';

export async function app(fastify: FastifyInstance, opts: Record<string, unknown>) {
  // Global support plugins (db, cors, zod, sensible, uploads, api-key gate).
  // All fastify-plugin-wrapped, so they decorate/apply to the root instance and
  // thus to every route group below.
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: { ...opts },
  });

  // --- Per-consumer route groups ------------------------------------------
  // Each register() is an encapsulation scope and the hook point for a future
  // per-group auth `preHandler`. No auth is wired here yet; the commented
  // addHook lines mark where it will go. URL prefixes are NOT applied to
  // public / consumer / admin, so all existing client URLs stay unchanged.
  // Only the agent group (new namespace, no existing clients) is prefixed.
  //
  // NOTE: keep .spec.ts files at src/app/ level, never inside routes/<group>/ —
  // those dirs are autoloaded and a spec would load as a plugin.

  // public: no auth. Health/version probe (api-key-exempt in plugins/api-key.ts).
  fastify.register(async (scope) => {
    // scope.addHook('preHandler', publicAuthHook); // TODO: per-group auth
    await scope.register(AutoLoad, {
      dir: path.join(__dirname, 'routes/public'),
      options: { ...opts },
    });
  });

  // admin MUST register BEFORE consumer: admin's plants-evals.ts declares the
  // static /plants/evals path; consumer's plants.ts declares /plants/:plantId.
  // Registering admin first preserves the static-before-parametric guard the
  // original code relied on.
  fastify.register(async (scope) => {
    // scope.addHook('preHandler', adminAuthHook); // TODO: per-group auth
    await scope.register(AutoLoad, {
      dir: path.join(__dirname, 'routes/admin'),
      options: { ...opts },
    });
  });

  // consumer (mobile-app tier): shared by dashboard too — dashboard simply
  // calls these same URLs, so no route duplication.
  fastify.register(async (scope) => {
    // scope.addHook('preHandler', consumerAuthHook); // TODO: per-group auth
    await scope.register(AutoLoad, {
      dir: path.join(__dirname, 'routes/consumer'),
      options: { ...opts },
    });
  });

  // agent: future backend-py namespace. Prefix is safe — no existing clients.
  fastify.register(async (scope) => {
    // scope.addHook('preHandler', agentAuthHook); // TODO: per-group auth
    await scope.register(AutoLoad, {
      dir: path.join(__dirname, 'routes/agent'),
      options: { ...opts },
      prefix: '/agent',
    });
  });
}