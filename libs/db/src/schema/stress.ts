import {
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { plantReports } from './reports';

export const stressVariables = pgTable('stress_variables', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
});

export const stressSigns = pgTable(
  'stress_signs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (table) => [uniqueIndex('stress_signs_sort_order_idx').on(table.sortOrder)]
);

export const stressSignVariables = pgTable(
  'stress_sign_variables',
  {
    stressSignId: text('stress_sign_id')
      .notNull()
      .references(() => stressSigns.id, { onDelete: 'cascade' }),
    stressVariableId: text('stress_variable_id')
      .notNull()
      .references(() => stressVariables.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({
      columns: [table.stressSignId, table.stressVariableId],
    }),
  ]
);

export const plantReportStressSigns = pgTable(
  'plant_report_stress_signs',
  {
    plantReportId: integer('plant_report_id')
      .notNull()
      .references(() => plantReports.id, { onDelete: 'cascade' }),
    stressSignId: text('stress_sign_id')
      .notNull()
      .references(() => stressSigns.id, { onDelete: 'restrict' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.plantReportId, table.stressSignId],
    }),
  ]
);

export type StressVariable = typeof stressVariables.$inferSelect;
export type NewStressVariable = typeof stressVariables.$inferInsert;
export type StressSign = typeof stressSigns.$inferSelect;
export type NewStressSign = typeof stressSigns.$inferInsert;
export type StressSignVariable = typeof stressSignVariables.$inferSelect;
export type NewStressSignVariable = typeof stressSignVariables.$inferInsert;
export type PlantReportStressSign = typeof plantReportStressSigns.$inferSelect;
export type NewPlantReportStressSign =
  typeof plantReportStressSigns.$inferInsert;
