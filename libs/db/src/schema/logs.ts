import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import { plants } from './plants';
import { plantReports } from './reports';
import { users } from './users';

export const userEvents = pgTable('user_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  plantId: integer('plant_id').references(() => plants.id, {
    onDelete: 'set null',
  }),
  plantReportId: integer('plant_report_id').references(() => plantReports.id, {
    onDelete: 'set null',
  }),
  eventName: text('event_name').notNull(),
  properties: jsonb('properties')
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const llmRequests = pgTable('llm_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  plantId: integer('plant_id').references(() => plants.id, {
    onDelete: 'set null',
  }),
  plantReportId: integer('plant_report_id').references(() => plantReports.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  prompt: text('prompt').notNull(),
  response: text('response'),
  model: text('model'),
  provider: text('provider'),
  requestMetadata: jsonb('request_metadata').$type<Record<string, unknown>>(),
  responseMetadata: jsonb('response_metadata').$type<Record<string, unknown>>(),
  latencyMs: integer('latency_ms'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type UserEvent = typeof userEvents.$inferSelect;
export type NewUserEvent = typeof userEvents.$inferInsert;
export type LlmRequest = typeof llmRequests.$inferSelect;
export type NewLlmRequest = typeof llmRequests.$inferInsert;
