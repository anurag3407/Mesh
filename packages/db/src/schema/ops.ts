import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { agents } from "./agents"
import { orgs } from "./identity"
import { messages } from "./messages"
import { rooms } from "./rooms"

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => messages.id, { onDelete: "set null" }),
    attempt: integer("attempt").notNull().default(1),
    statusCode: integer("status_code"),
    responseMs: integer("response_ms"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_deliveries_org_idx").on(t.orgId, t.createdAt)],
)

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6, mode: "number" }).notNull().default(0),
    ttftMs: integer("ttft_ms"),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("usage_events_org_created_idx").on(t.orgId, t.createdAt),
    index("usage_events_room_created_idx").on(t.roomId, t.createdAt),
  ],
)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    action: text("action").notNull(),
    target: text("target"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_org_created_idx").on(t.orgId, t.createdAt)],
)

export const modelPricing = pgTable(
  "model_pricing",
  {
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputPerMtok: numeric("input_per_mtok", { precision: 12, scale: 6, mode: "number" })
      .notNull()
      .default(0),
    outputPerMtok: numeric("output_per_mtok", { precision: 12, scale: 6, mode: "number" })
      .notNull()
      .default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.model] })],
)
