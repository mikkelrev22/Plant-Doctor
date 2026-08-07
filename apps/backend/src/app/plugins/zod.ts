import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import {
  validatorCompiler,
  serializerCompiler,
} from 'fastify-type-provider-zod';
import { AppError } from '../errors';

export default fp(async function (fastify: FastifyInstance) {
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation error',
        details: error.issues,
      });
      return;
    }

    // Domain errors (AppError) and @fastify/sensible http errors carry an
    // explicit HTTP status — serialize them directly so the client gets the
    // intended status code and message.
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.name,
        message: error.message,
      });
      return;
    }

    const status = (error as { statusCode?: unknown; status?: unknown })
      .statusCode ?? (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      reply.send(error);
      return;
    }

    // Unexpected internal errors: log the details for debugging, but return
    // a generic 500 so stack traces and internal messages never reach clients.
    request.log.error(error);
    reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
});
