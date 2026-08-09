import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { plantReports } from './reports';
import { plants } from './plants';
import { users } from './users';

// A chat session for the AI agent (backend-py / LangGraph). Each chat is bound
// to one plant (the default context) and optionally to the plant's latest
// report at creation time, so the agent can answer follow-up questions about
// that report without re-fetching it. The `chat_token` is the opaque handle
// handed to the agent — it authorizes subsequent tool-use queries scoped to this
// chat's user/plant, so the numeric `id` never leaves the backend. `history`
// holds the conversation JSON blob, written wholesale by saveChat and returned
// as-is by getChat; the shape is owned by the agent (LangGraph's message array),
// so it is left opaque here.
export const chats = pgTable(
  'chats',
  {
    id: serial('id').primaryKey(),
    chatToken: text('chat_token').notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    plantId: integer('plant_id')
      .notNull()
      .references(() => plants.id, { onDelete: 'cascade' }),
    defaultReportId: integer('default_report_id').references(() => plantReports.id, {
      onDelete: 'set null',
    }),
    history: jsonb('history').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex('chats_chat_token_idx').on(table.chatToken)],
);

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;