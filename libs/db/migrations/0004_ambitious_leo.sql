CREATE TABLE "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_token" text NOT NULL,
	"user_id" integer NOT NULL,
	"plant_id" integer NOT NULL,
	"default_report_id" integer,
	"history" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"chat_id" integer,
	"tool" text NOT NULL,
	"request_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_text" text,
	"latency_ms" integer,
	"llm_request_id" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_default_report_id_plant_reports_id_fk" FOREIGN KEY ("default_report_id") REFERENCES "public"."plant_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_llm_request_id_llm_requests_id_fk" FOREIGN KEY ("llm_request_id") REFERENCES "public"."llm_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chats_chat_token_idx" ON "chats" USING btree ("chat_token");--> statement-breakpoint
CREATE INDEX "agent_events_chat_id_idx" ON "agent_events" USING btree ("chat_id");