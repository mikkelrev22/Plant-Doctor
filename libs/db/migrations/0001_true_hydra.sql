ALTER TABLE "plant_reports" ADD COLUMN "report_payload" jsonb;--> statement-breakpoint
ALTER TABLE "plant_report_stress_signs" ADD COLUMN "status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "plant_report_stress_signs" ADD COLUMN "severity" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "plant_report_stress_signs" ADD COLUMN "confidence" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "plants_user_name_idx" ON "plants" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "plant_reports_plant_reported_at_idx" ON "plant_reports" USING btree ("plant_id","reported_at");