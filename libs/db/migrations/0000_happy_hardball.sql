CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT 'Research User' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_id" integer NOT NULL,
	"plant_report_id" integer,
	"image_url" text NOT NULL,
	"storage_key" text,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"captured_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"plant_id" integer NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stressors" text NOT NULL,
	"summary" text NOT NULL,
	"recommendations" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plant_report_stress_signs" (
	"plant_report_id" integer NOT NULL,
	"stress_sign_id" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plant_report_stress_signs_plant_report_id_stress_sign_id_pk" PRIMARY KEY("plant_report_id","stress_sign_id")
);
--> statement-breakpoint
CREATE TABLE "stress_sign_variables" (
	"stress_sign_id" text NOT NULL,
	"stress_variable_id" text NOT NULL,
	CONSTRAINT "stress_sign_variables_stress_sign_id_stress_variable_id_pk" PRIMARY KEY("stress_sign_id","stress_variable_id")
);
--> statement-breakpoint
CREATE TABLE "stress_signs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stress_variables" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plant_id" integer,
	"plant_report_id" integer,
	"action" text NOT NULL,
	"prompt" text NOT NULL,
	"response" text,
	"model" text,
	"provider" text,
	"request_metadata" jsonb,
	"response_metadata" jsonb,
	"latency_ms" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plant_id" integer,
	"plant_report_id" integer,
	"event_name" text NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plants" ADD CONSTRAINT "plants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_photos" ADD CONSTRAINT "plant_photos_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_photos" ADD CONSTRAINT "plant_photos_plant_report_id_plant_reports_id_fk" FOREIGN KEY ("plant_report_id") REFERENCES "public"."plant_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_reports" ADD CONSTRAINT "plant_reports_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_report_stress_signs" ADD CONSTRAINT "plant_report_stress_signs_plant_report_id_plant_reports_id_fk" FOREIGN KEY ("plant_report_id") REFERENCES "public"."plant_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plant_report_stress_signs" ADD CONSTRAINT "plant_report_stress_signs_stress_sign_id_stress_signs_id_fk" FOREIGN KEY ("stress_sign_id") REFERENCES "public"."stress_signs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stress_sign_variables" ADD CONSTRAINT "stress_sign_variables_stress_sign_id_stress_signs_id_fk" FOREIGN KEY ("stress_sign_id") REFERENCES "public"."stress_signs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stress_sign_variables" ADD CONSTRAINT "stress_sign_variables_stress_variable_id_stress_variables_id_fk" FOREIGN KEY ("stress_variable_id") REFERENCES "public"."stress_variables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_requests" ADD CONSTRAINT "llm_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_requests" ADD CONSTRAINT "llm_requests_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_requests" ADD CONSTRAINT "llm_requests_plant_report_id_plant_reports_id_fk" FOREIGN KEY ("plant_report_id") REFERENCES "public"."plant_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_events" ADD CONSTRAINT "user_events_plant_report_id_plant_reports_id_fk" FOREIGN KEY ("plant_report_id") REFERENCES "public"."plant_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stress_signs_sort_order_idx" ON "stress_signs" USING btree ("sort_order");--> statement-breakpoint
INSERT INTO "users" ("id", "display_name") VALUES
	(1, 'Research User');--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max("id") FROM "users"));--> statement-breakpoint
INSERT INTO "stress_variables" ("id", "name") VALUES
	('water', 'water'),
	('light', 'light'),
	('nutrients', 'nutrients'),
	('pests', 'pests'),
	('disease', 'disease'),
	('humidity', 'humidity'),
	('temperature', 'temperature'),
	('other', 'other');--> statement-breakpoint
INSERT INTO "stress_signs" ("id", "name", "sort_order") VALUES
	('leaf_yellowing_chlorosis', 'Leaf yellowing (chlorosis)', 1),
	('brown_crispy_tips_edges', 'Brown / crispy tips & edges', 2),
	('brown_spots_lesions', 'Brown spots / lesions', 3),
	('wilting_drooping', 'Wilting / drooping', 4),
	('leaf_drop', 'Leaf drop', 5),
	('leaf_curling', 'Leaf curling', 6),
	('pale_faded_color', 'Pale / faded color', 7),
	('leggy_etiolated_growth', 'Leggy / etiolated growth', 8),
	('soft_mushy_leaves_or_stem', 'Soft / mushy leaves or stem', 9),
	('visible_pests', 'Visible pests', 10),
	('powdery_mildew_white_residue', 'Powdery mildew / white residue', 11),
	('mold_algae_on_soil', 'Mold / algae on soil', 12),
	('sunburn_scorch', 'Sunburn / scorch', 13),
	('edema_blisters_corky_spots', 'Edema (blisters / corky spots)', 14),
	('fertilizer_mineral_burn', 'Fertilizer / mineral burn', 15),
	('dust_buildup_on_leaves', 'Dust buildup on leaves', 16);--> statement-breakpoint
INSERT INTO "stress_sign_variables" ("stress_sign_id", "stress_variable_id") VALUES
	('leaf_yellowing_chlorosis', 'nutrients'),
	('leaf_yellowing_chlorosis', 'water'),
	('leaf_yellowing_chlorosis', 'light'),
	('brown_crispy_tips_edges', 'nutrients'),
	('brown_crispy_tips_edges', 'water'),
	('brown_crispy_tips_edges', 'humidity'),
	('brown_spots_lesions', 'disease'),
	('brown_spots_lesions', 'water'),
	('wilting_drooping', 'water'),
	('wilting_drooping', 'temperature'),
	('leaf_drop', 'water'),
	('leaf_drop', 'temperature'),
	('leaf_drop', 'light'),
	('leaf_curling', 'water'),
	('leaf_curling', 'temperature'),
	('leaf_curling', 'light'),
	('leaf_curling', 'pests'),
	('pale_faded_color', 'nutrients'),
	('pale_faded_color', 'light'),
	('leggy_etiolated_growth', 'light'),
	('soft_mushy_leaves_or_stem', 'disease'),
	('soft_mushy_leaves_or_stem', 'water'),
	('visible_pests', 'pests'),
	('powdery_mildew_white_residue', 'disease'),
	('powdery_mildew_white_residue', 'humidity'),
	('mold_algae_on_soil', 'water'),
	('mold_algae_on_soil', 'humidity'),
	('sunburn_scorch', 'light'),
	('edema_blisters_corky_spots', 'water'),
	('fertilizer_mineral_burn', 'nutrients'),
	('dust_buildup_on_leaves', 'other');