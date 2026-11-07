import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { orgs, profiles } from "./identity"
import { agentRuns } from "./messages"

export const runSteps = pgTable(
  "run_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    kind: text("kind").notNull(), // 'model' | 'tool' | 'compaction' | 'recall' | 'plan' | 'subagent' | 'verify'
    inputRef: text("input_ref"),
    output: jsonb("output"),
    usage: jsonb("usage"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("run_steps_run_idx").on(t.runId, t.idx),
    index("run_steps_run_id_idx").on(t.runId),
  ],
)

export const runTranscripts = pgTable(
  "run_transcripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .unique()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    messages: jsonb("messages").notNull().default([]),
    compactedThroughIdx: integer("compacted_through_idx").notNull().default(0),
    plan: jsonb("plan"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("run_transcripts_run_id_idx").on(t.runId)],
)

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    body: text("body").notNull(),
    files: jsonb("files").notNull().default({}),
    version: integer("version").notNull().default(1),
    visibility: text("visibility").notNull().default("org"),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("skills_org_slug_idx").on(t.orgId, t.slug),
    index("skills_org_idx").on(t.orgId),
  ],
)
