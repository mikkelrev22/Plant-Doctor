/**
 * Domain-level errors thrown by services.
 *
 * The Fastify error handler in `plugins/zod.ts` maps these to their HTTP
 * status code. Throwing typed errors from services keeps the status code
 * close to the failure cause, and lets the handler return a generic 500
 * (without leaking internals) for anything unexpected.
 *
 * Use these instead of plain `Error` when the failure is something the
 * client can meaningfully act on (bad input, missing resource). Internal
 * invariants that "should never happen" can stay as plain `Error` — the
 * handler will log them and return a generic 500.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    // Keep each subclass's `name` accurate for error payloads/logging.
    this.name = new.target.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}