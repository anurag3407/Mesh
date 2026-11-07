import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { agents } from "./agents"
import { memoryKindEnum, memoryScopeEnum, memorySourceEnum } from "./enums"
import { orgs, profiles } from "./identity"
import { rooms } from "./rooms"

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    scope: memoryScopeEnum("scope").notNull().default("agent"),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").references(() => rooms.id, { onDelete: "cascade" }),
    kind: memoryKindEnum("kind").notNull().default("fact"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    tags: text("tags").array().notNull().default([]),
    source: memorySourceEnum("source").notNull().default("agent"),
    sourceRef: text("source_ref"),
    confidence: numeric("confidence", { precision: 4, scale: 3, mode: "number" })
      .notNull()
      .default(1.0),
    pinned: boolean("pinned").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    supersededBy: uuid("superseded_by"),
    createdByUserId: uuid("created_by_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdByAgentId: uuid("created_by_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    useCount: integer("use_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("memories_scope_idx").on(t.orgId, t.scope, t.agentId, t.roomId),
    index("memories_pinned_idx").on(t.orgId, t.pinned),
    index("memories_last_used_idx").on(t.orgId, t.lastUsedAt),
  ],
)
