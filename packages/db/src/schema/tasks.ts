import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { agents } from "./agents"
import { taskKindEnum, taskStatusEnum } from "./enums"
import { orgs, profiles } from "./identity"
import { rooms } from "./rooms"

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: serial("number").notNull(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    kind: taskKindEnum("kind").notNull().default("task"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: taskStatusEnum("status").notNull().default("open"),
    assigneeUserId: uuid("assignee_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    assigneeAgentId: uuid("assignee_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    requestedByAgentId: uuid("requested_by_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    requestedFromUserId: uuid("requested_from_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tasks_room_status_idx").on(t.roomId, t.status),
    index("tasks_org_status_idx").on(t.orgId, t.status),
    index("tasks_assignee_agent_idx").on(t.assigneeAgentId),
  ],
)

export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorType: text("author_type").notNull().default("human"),
    authorId: uuid("author_id"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("task_comments_task_idx").on(t.taskId, t.createdAt)],
)
