import {
  integer,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { chats } from './chats';
import { llmRequests } from './logs';
import { users } from './users';

// One row per agent API call (chat lifecycle + tool use), for metrics and
// debugging. Mirrors the `llm_requests` logging pattern: `request_params`
// captures the inbound request, `response_text` the (truncated) plain-text
// response, `latency_ms` the round-trip. `llm_request_id` links to the
// `llm_requests` row for `lookAtPhoto` (the only tool that calls an LLM).
export const agentEvents = pgTable(
  'agent_events',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chatId: integer('chat_id').references(() => chats.id, {
      onDelete: 'set null',
    }),
    tool: text('tool').notNull(),
    requestParams: jsonb('request_params')
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    responseText: text('response_text'),
    latencyMs: integer('latency_ms'),
    llmRequestId: integer('llm_request_id').references(() => llmRequests.id, {
      onDelete: 'set null',
    }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('agent_events_chat_id_idx').on(table.chatId)],
);

export type AgentEvent = typeof agentEvents.$inferSelect;
export type NewAgentEvent = typeof agentEvents.$inferInsert;