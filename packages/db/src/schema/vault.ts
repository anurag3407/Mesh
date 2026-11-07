import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { agents } from "./agents"
import { vaultSecretKindEnum } from "./enums"
import { orgs, profiles } from "./identity"

export interface GrantInjectSpec {
  mode: "header" | "basic" | "query" | "body"
  template?: string
  param?: string
}

export const vaultSecrets = pgTable(
  "vault_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id").references(() => profiles.id, { onDelete: "set null" }),
    label: text("label").notNull(),
    kind: vaultSecretKindEnum("kind").notNull(),
    sealed: text("sealed").notNull(),
    last4: text("last4").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vault_secrets_org_idx").on(t.orgId)],
)

export const agentSecretGrants = pgTable(
  "agent_secret_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    secretId: uuid("secret_id")
      .notNull()
      .references(() => vaultSecrets.id, { onDelete: "cascade" }),
    envName: text("env_name").notNull(),
    placeholder: text("placeholder").notNull().unique(),
    allowedHosts: text("allowed_hosts").array().notNull(),
    inject: jsonb("inject").$type<GrantInjectSpec>().notNull().default({ mode: "header" }),
    methods: text("methods").array(),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("agent_secret_grants_agent_env_idx").on(t.agentId, t.envName),
    index("agent_secret_grants_agent_idx").on(t.agentId),
    index("agent_secret_grants_secret_idx").on(t.secretId),
    index("agent_secret_grants_placeholder_idx").on(t.placeholder),
  ],
)

export const orgQuotas = pgTable("org_quotas", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => orgs.id, { onDelete: "cascade" }),
  maxAgents: integer("max_agents").notNull().default(25),
  maxComputers: integer("max_computers").notNull().default(5),
  maxRunningComputers: integer("max_running_computers").notNull().default(2),
  maxDiskMbTotal: integer("max_disk_mb_total").notNull().default(20480),
  maxSecrets: integer("max_secrets").notNull().default(50),
  egressMode: text("egress_mode").notNull().default("open"),
  egressAllowlist: text("egress_allowlist").array().notNull().default([]),
})
