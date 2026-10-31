import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { roomKindEnum, roomMemberRoleEnum, turnModeEnum } from "./enums"
import { agents } from "./agents"
import { orgs, profiles } from "./identity"

export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: roomKindEnum("kind").notNull().default("private"),
    turnMode: turnModeEnum("turn_mode").notNull().default("mentions"),
    systemDirective: text("system_directive"),
    turnCap: integer("turn_cap").notNull().default(3),
    rpmLimit: integer("rpm_limit"),
    dailyBudgetUsd: numeric("daily_budget_usd", { precision: 12, scale: 6, mode: "number" }),
    moderatorAgentId: uuid("moderator_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    debateOrder: uuid("debate_order").array().notNull().default([]),
    timezone: text("timezone").notNull().default("UTC"),
    agentDmUserId: uuid("agent_dm_user_id").references(() => profiles.id, { onDelete: "set null" }),
    agentDmAgentId: uuid("agent_dm_agent_id").references(() => agents.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("rooms_org_idx").on(t.orgId),
    uniqueIndex("rooms_agent_dm_idx").on(t.agentDmUserId, t.agentDmAgentId),
    check("rooms_turn_cap_check", sql`${t.turnCap} between 1 and 10`),
  ],
)

export const roomMembers = pgTable(
  "room_members",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: roomMemberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })],
)

export const roomAgents = pgTable(
  "room_agents",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roomId, t.agentId] }),
    index("room_agents_agent_idx").on(t.agentId),
  ],
)

export const roomReads = pgTable(
  "room_reads",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
    pinned: boolean("pinned").notNull().default(false),
    mutedUntil: timestamp("muted_until", { withTimezone: true }),
    archived: boolean("archived").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roomId] }),
    index("room_reads_room_idx").on(t.roomId),
  ],
)
