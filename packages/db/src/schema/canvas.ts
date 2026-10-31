import { customType, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { canvasKindEnum } from "./enums"
import { profiles } from "./identity"
import { rooms } from "./rooms"

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea"
  },
})

export const canvases = pgTable(
  "canvases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    kind: canvasKindEnum("kind").notNull().default("markdown"),
    title: text("title").notNull(),
    language: text("language"),
    ydocState: bytea("ydoc_state"),
    snapshotText: text("snapshot_text").notNull().default(""),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("canvases_room_idx").on(t.roomId)],
)

export const canvasVersions = pgTable(
  "canvas_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canvasId: uuid("canvas_id")
      .notNull()
      .references(() => canvases.id, { onDelete: "cascade" }),
    authorType: text("author_type").notNull(),
    authorId: uuid("author_id"),
    snapshotText: text("snapshot_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("canvas_versions_canvas_idx").on(t.canvasId, t.createdAt)],
)
