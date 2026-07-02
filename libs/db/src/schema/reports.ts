import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { plants } from './plants';

export const plantReports = pgTable('plant_reports', {
  id: serial('id').primaryKey(),
  plantId: integer('plant_id')
    .notNull()
    .references(() => plants.id, { onDelete: 'cascade' }),
  reportedAt: timestamp('reported_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  stressors: text('stressors').notNull(),
  summary: text('summary').notNull(),
  recommendations: text('recommendations').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const plantPhotos = pgTable('plant_photos', {
  id: serial('id').primaryKey(),
  plantId: integer('plant_id')
    .notNull()
    .references(() => plants.id, { onDelete: 'cascade' }),
  plantReportId: integer('plant_report_id').references(() => plantReports.id, {
    onDelete: 'set null',
  }),
  imageUrl: text('image_url').notNull(),
  storageKey: text('storage_key'),
  mimeType: text('mime_type'),
  width: integer('width'),
  height: integer('height'),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type PlantReport = typeof plantReports.$inferSelect;
export type NewPlantReport = typeof plantReports.$inferInsert;
export type PlantPhoto = typeof plantPhotos.$inferSelect;
export type NewPlantPhoto = typeof plantPhotos.$inferInsert;
