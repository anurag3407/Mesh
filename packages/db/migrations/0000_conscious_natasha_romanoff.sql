CREATE TYPE "public"."agent_kind" AS ENUM('llm', 'external');--> statement-breakpoint
CREATE TYPE "public"."agent_run_status" AS ENUM('running', 'complete', 'error', 'halted');--> statement-breakpoint
CREATE TYPE "public"."builtin_tool" AS ENUM('web_search', 'github_bridge', 'postgres_inspector');--> statement-breakpoint
CREATE TYPE "public"."canvas_kind" AS ENUM('markdown', 'code', 'svg', 'html');--> statement-breakpoint
CREATE TYPE "public"."mcp_transport" AS ENUM('http', 'sse');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('streaming', 'complete', 'error', 'halted');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('openai', 'anthropic', 'google', 'groq', 'cerebras', 'openai-compatible');--> statement-breakpoint
CREATE TYPE "public"."room_kind" AS ENUM('public', 'private', 'dm');--> statement-breakpoint
CREATE TYPE "public"."room_member_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."sender_type" AS ENUM('human', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."tool_call_status" AS ENUM('pending_approval', 'approved', 'rejected', 'running', 'done', 'error');--> statement-breakpoint
CREATE TYPE "public"."turn_mode" AS ENUM('mentions', 'debate', 'moderated');--> statement-breakpoint
CREATE TYPE "public"."turn_role" AS ENUM('responder', 'producer', 'critic', 'summarizer', 'moderator');--> statement-breakpoint
CREATE TYPE "public"."turn_session_state" AS ENUM('active', 'complete', 'halted', 'superseded');--> statement-breakpoint
CREATE TABLE "org_members" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_members_org_id_user_id_pk" PRIMARY KEY("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sso_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orgs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" text[] DEFAULT '{"messages:write"}' NOT NULL,
	"label" text DEFAULT 'default' NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_api_keys_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"kind" "agent_kind" DEFAULT 'llm' NOT NULL,
	"provider_key_id" uuid,
	"model" text,
	"system_prompt" text DEFAULT '' NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tool_ids" uuid[] DEFAULT '{}' NOT NULL,
	"webhook_url" text,
	"webhook_secret_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_tool_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"tool" text NOT NULL,
	"config_enc" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"provider" "provider" NOT NULL,
	"base_url" text,
	"label" text NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"tag" text NOT NULL,
	"last4" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_agents" (
	"room_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_agents_room_id_agent_id_pk" PRIMARY KEY("room_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "room_members" (
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "room_member_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "room_members_room_id_user_id_pk" PRIMARY KEY("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "room_kind" DEFAULT 'private' NOT NULL,
	"turn_mode" "turn_mode" DEFAULT 'mentions' NOT NULL,
	"system_directive" text,
	"turn_cap" integer DEFAULT 3 NOT NULL,
	"rpm_limit" integer,
	"daily_budget_usd" numeric(12, 6),
	"moderator_agent_id" uuid,
	"debate_order" uuid[] DEFAULT '{}' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_turn_cap_check" CHECK ("rooms"."turn_cap" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"room_id" uuid NOT NULL,
	"agent_id" uuid,
	"message_id" uuid,
	"step" integer DEFAULT 0 NOT NULL,
	"role" "turn_role" DEFAULT 'responder' NOT NULL,
	"status" "agent_run_status" DEFAULT 'running' NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(12, 6) DEFAULT 0 NOT NULL,
	"ttft_ms" integer,
	"latency_ms" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"thread_root_id" uuid,
	"sender_type" "sender_type" NOT NULL,
	"sender_id" uuid,
	"content" text DEFAULT '' NOT NULL,
	"status" "message_status" DEFAULT 'complete' NOT NULL,
	"mentions" text[] DEFAULT '{}' NOT NULL,
	"run_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turn_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"thread_root_id" uuid,
	"trigger_message_id" uuid,
	"bot_turns_used" integer DEFAULT 0 NOT NULL,
	"state" "turn_session_state" DEFAULT 'active' NOT NULL,
	"queue" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvas_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canvas_id" uuid NOT NULL,
	"author_type" text NOT NULL,
	"author_id" uuid,
	"snapshot_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "canvases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"kind" "canvas_kind" DEFAULT 'markdown' NOT NULL,
	"title" text NOT NULL,
	"language" text,
	"ydoc_state" "bytea",
	"snapshot_text" text DEFAULT '' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"room_id" uuid,
	"name" text NOT NULL,
	"transport" "mcp_transport" DEFAULT 'http' NOT NULL,
	"url" text NOT NULL,
	"headers_enc" text,
	"dangerous_tools" text[] DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"room_id" uuid NOT NULL,
	"message_id" uuid,
	"tool_name" text NOT NULL,
	"args" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"status" "tool_call_status" DEFAULT 'running' NOT NULL,
	"approved_by" uuid,
	"resolved_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_pricing" (
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_per_mtok" numeric(12, 6) DEFAULT 0 NOT NULL,
	"output_per_mtok" numeric(12, 6) DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_pricing_provider_model_pk" PRIMARY KEY("provider","model")
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"room_id" uuid,
	"agent_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT 0 NOT NULL,
	"ttft_ms" integer,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"room_id" uuid,
	"agent_id" uuid,
	"message_id" uuid,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status_code" integer,
	"response_ms" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_members" ADD CONSTRAINT "org_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_api_keys" ADD CONSTRAINT "agent_api_keys_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_provider_key_id_provider_keys_id_fk" FOREIGN KEY ("provider_key_id") REFERENCES "public"."provider_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_tool_configs" ADD CONSTRAINT "org_tool_configs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_tool_configs" ADD CONSTRAINT "org_tool_configs_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_keys" ADD CONSTRAINT "provider_keys_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_keys" ADD CONSTRAINT "provider_keys_owner_user_id_profiles_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_agents" ADD CONSTRAINT "room_agents_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_agents" ADD CONSTRAINT "room_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_moderator_agent_id_agents_id_fk" FOREIGN KEY ("moderator_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_session_id_turn_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."turn_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turn_sessions" ADD CONSTRAINT "turn_sessions_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_versions" ADD CONSTRAINT "canvas_versions_canvas_id_canvases_id_fk" FOREIGN KEY ("canvas_id") REFERENCES "public"."canvases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvases" ADD CONSTRAINT "canvases_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_run_id_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_members_user_idx" ON "org_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agent_api_keys_agent_idx" ON "agent_api_keys" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agents_org_handle_idx" ON "agents" USING btree ("org_id","handle");--> statement-breakpoint
CREATE INDEX "agents_org_idx" ON "agents" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_tool_configs_org_tool_idx" ON "org_tool_configs" USING btree ("org_id","tool");--> statement-breakpoint
CREATE INDEX "provider_keys_org_idx" ON "provider_keys" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "room_agents_agent_idx" ON "room_agents" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "rooms_org_idx" ON "rooms" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "agent_runs_room_created_idx" ON "agent_runs" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_runs_session_idx" ON "agent_runs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "messages_room_created_idx" ON "messages" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("thread_root_id");--> statement-breakpoint
CREATE INDEX "messages_run_idx" ON "messages" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "turn_sessions_room_idx" ON "turn_sessions" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "canvas_versions_canvas_idx" ON "canvas_versions" USING btree ("canvas_id","created_at");--> statement-breakpoint
CREATE INDEX "canvases_room_idx" ON "canvases" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "mcp_servers_org_idx" ON "mcp_servers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "mcp_servers_room_idx" ON "mcp_servers" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "tool_calls_room_idx" ON "tool_calls" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "tool_calls_run_idx" ON "tool_calls" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_org_created_idx" ON "usage_events" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_events_room_created_idx" ON "usage_events" USING btree ("room_id","created_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_org_idx" ON "webhook_deliveries" USING btree ("org_id","created_at");