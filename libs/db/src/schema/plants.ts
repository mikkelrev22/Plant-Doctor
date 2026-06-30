import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const plants = pgTable('plants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  species: text('species'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
