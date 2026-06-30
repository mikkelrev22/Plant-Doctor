import { relations } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { plants } from './plants';

export const diagnoses = pgTable('diagnoses', {
  id: uuid('id').defaultRandom().primaryKey(),
  plantId: uuid('plant_id')
    .notNull()
    .references(() => plants.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  symptoms: jsonb('symptoms').$type<string[]>().default([]).notNull(),
  recommendations: jsonb('recommendations').$type<string[]>().default([]).notNull(),
  confidence: integer('confidence'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const plantRelations = relations(plants, ({ many }) => ({
  diagnoses: many(diagnoses),
}));

export const diagnosisRelations = relations(diagnoses, ({ one }) => ({
  plant: one(plants, {
    fields: [diagnoses.plantId],
    references: [plants.id],
  }),
}));

export type Diagnosis = typeof diagnoses.$inferSelect;
export type NewDiagnosis = typeof diagnoses.$inferInsert;
