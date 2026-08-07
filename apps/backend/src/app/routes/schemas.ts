import { z } from 'zod';

// Shared request-param schemas. The list endpoints all take a single numeric
// id from the path; centralizing these removes the repeated inline
// `z.object({ …Id: z.coerce.number().int() })` copies across route files.

/** Path params for `/plants/:plantId` and its sub-routes. */
export const plantIdParams = z.object({
  plantId: z.coerce.number().int(),
});

/** Path params for `/reports/:reportId`. */
export const reportIdParams = z.object({
  reportId: z.coerce.number().int(),
});

/** Path params for `/llm-requests/:llmRequestId`. */
export const llmRequestIdParams = z.object({
  llmRequestId: z.coerce.number().int(),
});