CREATE TYPE "public"."meeting_kind" AS ENUM('meeting', 'checkin');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('scheduled', 'active', 'ended', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."task_kind" AS ENUM('task', 'request');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'in_progress', 'stuck', 'done');--> statement-breakpoint
CREATE TABLE "room_reads" (
	"user_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"muted_until" timestamp with time zone,
	"archived" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_reads_user_id_room_id_pk" PRIMARY KEY("user_id","room_id")
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"kind" "meeting_kind" DEFAULT 'meeting' NOT NULL,
	"title" text NOT NULL,
	"agenda" text DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "meeting_status" DEFAULT 'scheduled' NOT NULL,
	"created_by" uuid,
	"prompt_message_id" uuid,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_schedules" (
	"room_id" uuid PRIMARY KEY NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"morning_start_minutes" integer DEFAULT 540 NOT NULL,
	"morning_end_minutes" integer DEFAULT 570 NOT NULL,
	"evening_start_minutes" integer DEFAULT 1020 NOT NULL,
	"evening_end_minutes" integer DEFAULT 1050 NOT NULL,
	"checkins_enabled" boolean DEFAULT false NOT NULL,
	"checkin_interval_minutes" integer DEFAULT 60 NOT NULL,
	"checkin_start_minutes" integer DEFAULT 540 NOT NULL,
	"checkin_end_minutes" integer DEFAULT 1050 NOT NULL,
	"checkin_duration_minutes" integer DEFAULT 10 NOT NULL,
	"last_checkin_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"author_type" text DEFAULT 'human' NOT NULL,
	"author_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" serial NOT NULL,
	"org_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"kind" "task_kind" DEFAULT 'task' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"assignee_user_id" uuid,
	"assignee_agent_id" uuid,
	"requested_by_agent_id" uuid,
	"requested_from_user_id" uuid,
	"created_by" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "preferences" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "agent_dm_user_id" uuid;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN "agent_dm_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "room_reads" ADD CONSTRAINT "room_reads_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_reads" ADD CONSTRAINT "room_reads_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_prompt_message_id_messages_id_fk" FOREIGN KEY ("prompt_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_schedules" ADD CONSTRAINT "room_schedules_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_user_id_profiles_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_agent_id_agents_id_fk" FOREIGN KEY ("assignee_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requested_by_agent_id_agents_id_fk" FOREIGN KEY ("requested_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_requested_from_user_id_profiles_id_fk" FOREIGN KEY ("requested_from_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "room_reads_room_idx" ON "room_reads" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "meetings_room_start_idx" ON "meetings" USING btree ("room_id","starts_at");--> statement-breakpoint
CREATE INDEX "meetings_org_start_idx" ON "meetings" USING btree ("org_id","starts_at");--> statement-breakpoint
CREATE INDEX "meetings_status_idx" ON "meetings" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "task_comments_task_idx" ON "task_comments" USING btree ("task_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_room_status_idx" ON "tasks" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "tasks_org_status_idx" ON "tasks" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "tasks_assignee_agent_idx" ON "tasks" USING btree ("assignee_agent_id");--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_agent_dm_user_id_profiles_id_fk" FOREIGN KEY ("agent_dm_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_agent_dm_agent_id_agents_id_fk" FOREIGN KEY ("agent_dm_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rooms_agent_dm_idx" ON "rooms" USING btree ("agent_dm_user_id","agent_dm_agent_id");