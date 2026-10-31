# Mesh — Implementation Plan

> A real-time collaboration workspace where human teams and AI agents work as peers in shared rooms.
> This plan covers all 4 PRD phases.

---

## 1. Context & Decisions

Mesh puts humans, BYOK cloud models, local or OpenAI-compatible models, and external webhook bots in shared rooms. The platform provides:

- deterministic turn-taking
- a live CRDT canvas
- MCP tools
- E2B sandboxes
- circuit breakers
- an open bot gateway

| Decision | Choice |
|---|---|
| Scope | All 4 phases (MVP → canvas/BYOK → tools/sandbox/breakers → bot gateway/hardening) |
| Frontend | Next.js (App Router) |
| Backend / DB / Auth / Realtime | Hosted Supabase. Docker isn't installed, so the local Supabase CLI stack is out. |
| Test LLM | The user's OpenAI-compatible endpoint |
| Workspace | `/Users/jarvis/saaya` (greenfield, git initialized) |
| Toolchain | Node 24, pnpm 10.33, bun 1.3 |

---

## 2. Tech Stack (versions checked 2026-10-31)

| Layer | Choice | Version | Why |
|---|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | turbo 2.11 | Web, orchestrator and shared packages in one repo |
| Frontend | Next.js App Router, RSC, Server Actions, React 19, TS strict | next 16.4, react 19.3 | Requested |
| UI | Tailwind v4, shadcn/ui, lucide, `react-resizable-panels` | tailwindcss 4.3 | Developer-first look, split pane |
| Chat rendering | Streamdown (GFM, KaTeX, Mermaid, Shiki) | streamdown 2.7 | Renders half-finished markdown cleanly while tokens stream |
| DB / Auth / Realtime | Supabase (Postgres, Auth, Realtime Broadcast + Presence + postgres_changes, RLS) | supabase-js 2.118, @supabase/ssr 0.12 | PRD choice |
| ORM | Drizzle ORM + drizzle-kit; RLS policies as SQL migrations | drizzle-orm 0.45, drizzle-kit 0.31 | Typed schema shared by web and orchestrator |
| LLM | Vercel AI SDK with `@ai-sdk/openai`, `anthropic`, `google`, `groq`, `cerebras`, `openai-compatible` | ai 7.0 | One streaming and tool-calling API for every provider, including Ollama, vLLM and LM Studio |
| MCP | `@ai-sdk/mcp` client (HTTP / SSE transports) | 2.0 | Native tools for every agent |
| Sandbox | E2B `@e2b/code-interpreter` | latest | Firecracker microVMs, 60 s timeout |
| Canvas CRDT | Yjs + Hocuspocus (Postgres persistence); TipTap (markdown), Monaco + `y-monaco` (code); sandboxed iframe for HTML/SVG/React previews | yjs 13.6, hocuspocus 4.8 | Edits sync in under 100 ms; agents patch the Y.Doc server-side |
| Jobs / queue | pg-boss on Supabase Postgres | pg-boss 12 | Durable jobs with no Redis |
| Orchestrator | Node service on Hono | hono 4.13, @hono/node-server 2.1 | Long-running streams and debate chains can't run inside serverless time limits |
| Validation | zod | zod 4 | Messages, webhook payloads, agent configs |
| PWA | Serwist + IndexedDB outbox | latest | Phase 4 |
| Charts | shadcn charts (Recharts) | — | Analytics dashboard |
| Tests | Vitest, AI SDK mock models, Playwright | vitest 5 | Unit tests, deterministic LLM tests, multi-user e2e |

AI SDK 7, pg-boss 12, Next 16 and Vitest 5 are newer than the APIs I know well. I'll check each against its installed type definitions before writing integration code.

---

## 3. Repository Layout

```
/Users/jarvis/saaya
├── apps/
│   ├── web/                 Next.js: UI, server actions, auth, /api/v1/* proxy → orchestrator
│   └── orchestrator/        Hono: turn coordinator, LLM runner, tool runner, Hocuspocus, bot gateway
├── packages/
│   ├── core/                Pure logic: zod types, mentions, redaction, repetition, breakers, turn planner, patches
│   ├── db/                  Drizzle schema, migrations, RLS SQL, seeds
│   └── llm/                 Provider registry (BYOK → AI SDK model), AES-256-GCM crypto, MCP client factory
├── examples/
│   └── python-bot/          Reference external agent (webhook receiver + streaming reply)
├── e2e/                     Playwright specs
├── package.json · pnpm-workspace.yaml · turbo.json · tsconfig.base.json
└── .env.example
```

Packages are consumed as TypeScript source (`exports: "./src/index.ts"`): Next uses `transpilePackages`, and the orchestrator runs on `tsx`. `@mesh/core` exposes `.` (isomorphic) and `./server` (node-only helpers such as webhook signing).

---

## 4. Data Model (`packages/db/src/schema/*`)

### Identity & tenancy
| Table | Key columns |
|---|---|
| `profiles` | `id` (= auth.users.id), `display_name`, `avatar_url` |
| `orgs` | `id`, `slug`, `name`, `sso_enabled` |
| `org_members` | `org_id`, `user_id`, `role` (owner, admin, member) |

### Rooms
| Table | Key columns |
|---|---|
| `rooms` | `id`, `org_id`, `name`, `kind` (public, private, dm), `turn_mode` (mentions, debate, moderated), `system_directive`, `turn_cap` (1–10, default 3), `rpm_limit`, `daily_budget_usd`, `moderator_agent_id`, `debate_order uuid[]` |
| `room_members` | `room_id`, `user_id`, `role` (admin, member) |
| `room_agents` | `room_id`, `agent_id`, `position` |

### Agents & secrets
| Table | Key columns |
|---|---|
| `agents` | `id`, `org_id`, `handle`, `display_name`, `kind` (llm, external), `provider_key_id`, `model`, `system_prompt`, `params jsonb`, `tool_ids[]`, `webhook_url`, `webhook_secret_enc` |
| `provider_keys` | `id`, `org_id`, `owner_user_id`, `provider`, `base_url`, `label`, `ciphertext`, `iv`, `tag`, `last4` |
| `agent_api_keys` | `id`, `agent_id`, `prefix`, `key_hash` (sha256), `scopes[]`, `revoked_at`, `last_used_at` |

### Messaging & orchestration
| Table | Key columns |
|---|---|
| `messages` | `id`, `room_id`, `thread_root_id`, `sender_type` (human, agent, system), `sender_id`, `content`, `status` (streaming, complete, error, halted), `mentions[]`, `run_id`, `metadata jsonb`, `created_at` |
| `turn_sessions` | `id`, `room_id`, `thread_root_id`, `trigger_message_id`, `bot_turns_used`, `state`, `queue jsonb` |
| `agent_runs` | `id`, `session_id`, `agent_id`, `step`, `role`, `status`, `input_tokens`, `output_tokens`, `cost_usd`, `ttft_ms`, `latency_ms`, `error` |

### Canvas
| Table | Key columns |
|---|---|
| `canvases` | `id`, `room_id`, `kind` (markdown, code, svg, html), `title`, `language`, `ydoc_state bytea`, `snapshot_text`, `updated_at` |
| `canvas_versions` | `id`, `canvas_id`, `author_type`, `author_id`, `snapshot_text`, `created_at` |

### Tools
| Table | Key columns |
|---|---|
| `mcp_servers` | `id`, `org_id`, `room_id` (nullable = org-wide), `name`, `transport` (http, sse), `url`, `headers_enc`, `dangerous_tools[]`, `enabled` |
| `tool_calls` | `id`, `run_id`, `room_id`, `tool_name`, `args jsonb`, `result jsonb`, `status` (pending_approval, approved, rejected, running, done, error), `approved_by`, `resolved_at` |

### Ops
| Table | Key columns |
|---|---|
| `webhook_deliveries` | `id`, `agent_id`, `message_id`, `attempt`, `status_code`, `response_ms`, `error` |
| `usage_events` | `id`, `org_id`, `room_id`, `agent_id`, `provider`, `model`, `input_tokens`, `output_tokens`, `cost_usd`, `ttft_ms`, `created_at` |
| `audit_logs` | `id`, `org_id`, `actor_type`, `actor_id`, `action`, `target`, `metadata jsonb`, `created_at` |
| `model_pricing` | `provider`, `model`, `input_per_mtok`, `output_per_mtok`. Edited by admins in settings; models with no row cost $0. |

### RLS
- Users can read and write only rooms where they have a `room_members` row, or public rooms in an org they belong to.
- `provider_keys` ciphertext is **never** selectable by the `authenticated` role. A view exposes only `label`, `provider` and `last4`.
- The orchestrator connects with the service role / direct `DATABASE_URL` and enforces membership in code.

---

## 5. Core Runtime Flows

### 5.1 Human message
1. The `sendMessage` server action validates input with zod and inserts the row through RLS-checked Supabase.
2. It runs `parseMentions()` from `@mesh/core` and enqueues the pg-boss job `room.message` with `{roomId, messageId}`.
3. Clients receive the row through `postgres_changes`. Presence and typing go over the Realtime Presence channel.

### 5.2 Turn coordinator (`apps/orchestrator/src/coordinator/`)
- It takes a per-room `pg_advisory_lock`, so each room's turns are serialized even with several orchestrator instances.
- A new human message resets `bot_turns_used` and supersedes any active session.
- **Turn modes:**
  - **mentions** (default): tagged agents are queued in mention order. `@all_bots` expands to every room agent. When a bot @mentions another bot in its reply, that bot is appended to the queue (bot-to-bot), subject to the cap.
  - **debate:** follows `debate_order` (or room order), producer → critic(s) → summarizer, then control returns to the human. Mentions narrow the participants. Each role adds an instruction to that agent's prompt.
  - **moderated:** explicit mentions win. Otherwise the moderator model is called with `generateObject`, which returns `{ next: agentId | "human", reason }`, and this repeats until it says "human" or a breaker trips.
- **Pre-turn breakers**, checked in this order:
  1. hard turn cap
  2. RPM limit
  3. daily dollar budget
- **Post-turn breaker:** the repetition detector compares the reply with recent bot replies (normalized Levenshtein ≥ 0.85, word-cosine ≥ 0.92, or three consecutive polite agreements). A match stops the chain.
- When a breaker trips, the coordinator posts a `system` message with `status=halted` stating the reason. No further LLM call is made.
- Live queue state is broadcast as a `turn.state` event so the UI can show who is speaking next.

### 5.3 LLM run (`apps/orchestrator/src/runner/llm.ts`)
1. Load the agent, decrypt its BYOK key (`MESH_KEK`), and build the AI SDK model through the `@mesh/llm` registry.
2. Build the context:
   - room system directive
   - agent system prompt
   - debate role instruction, if any
   - the last N messages, labelled `[Name (human|agent)]:` so models can tell peers apart
   - the active canvas snapshot
3. Call `streamText` with these tools:
   - MCP tools for the room and org
   - `code_sandbox`
   - `canvas_write`
   - `canvas_patch`
4. Insert a `messages` row with `status=streaming` and broadcast `message.delta` events with sequence numbers on `room:{id}`, batched every ~40 ms.
5. Persist partial content about every 1 s so late joiners can catch up.
6. On finish:
   - redact secrets
   - finalize the row
   - write `agent_runs` and `usage_events` (cost from `model_pricing`)
   - broadcast `message.done`

### 5.4 Dangerous tools & human approval
- A tool is dangerous if it is listed in `mcp_servers.dangerous_tools`. Built-in writes (GitHub commits, non-read-only SQL) are always dangerous.
- In `execute`:
  1. Insert a `tool_calls` row with `status=pending_approval`.
  2. Broadcast `tool.approval_requested`.
  3. Wait on `LISTEN tool_call_resolved` (5 min timeout, which counts as a rejection).
- The UI shows an inline approval card. Only room admins can approve.
- The decision is a server action that updates the row and sends `pg_notify`.

### 5.5 Live canvas
- Clients connect to Hocuspocus at `/collab`. `onAuthenticate` verifies the Supabase JWT and room membership.
- Agents edit server-side through a Hocuspocus direct connection:
  - `canvas_write(canvasId, content)`: full rewrite.
  - `canvas_patch(canvasId, edits[{search, replace}])`: each search must match exactly once. Edits become splices that are applied as Yjs delete/insert ops, so concurrent human edits are kept.
- Persistence is debounced (2 s) into `canvases.ydoc_state` and `snapshot_text`. A `canvas_versions` row is written for every agent edit.

### 5.6 External bots (Open Bot Gateway)
1. **Inbound dispatch:** the coordinator POSTs the PRD webhook payload to the agent's `webhook_url`.
   - Headers follow Standard Webhooks: `webhook-id`, `webhook-timestamp`, `webhook-signature` (HMAC-SHA256).
   - pg-boss retries with exponential backoff, and every attempt is logged in `webhook_deliveries`.
2. **Bot reply.** Authentication is `Authorization: Bearer mesh_ak_…`, checked against a hashed lookup and scoped to the agent's rooms. There are two endpoints:
   - `POST /v1/rooms/:roomId/messages`: `{content, thread_id?, reply_to?}`.
   - `POST /v1/rooms/:roomId/messages/stream`: a chunked NDJSON body of `{"delta":"…"}` lines ending with `{"done":true}`. An SSE body is also accepted. Chunks are relayed through the same broadcast path as LLM output.
3. The coordinator holds the floor for up to 60 s waiting for the bot's reply, then moves on. This keeps turn order deterministic.

### 5.7 Threads
Replies carry `thread_root_id` and open in a side sheet. Turn sessions are scoped per thread, so bot conversations in a thread never pollute the main feed.

---

## 6. API Surface

### Server Actions (apps/web)
- **Orgs, rooms and members:** `createOrg`, `createRoom`, `updateRoomSettings`, `inviteMember`, `setMemberRole`
- **Messages:** `sendMessage`, `stopGeneration`
- **Agents:** `createAgent`, `updateAgent`, `addAgentToRoom`, `removeAgentFromRoom`, `testAgent`
- **BYOK keys:** `saveProviderKey`, `deleteProviderKey`, `testProviderKey`
- **MCP:** `addMcpServer`, `listMcpTools`, `invokeMcpTool` (inspector)
- **Approvals:** `resolveToolCall`
- **Bot keys:** `issueAgentApiKey`, `revokeAgentApiKey`
- **Canvas:** `createCanvas`, `restoreCanvasVersion`

### Orchestrator HTTP (Hono, :4000; proxied by web at `/api/v1/*`)
| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | — | Liveness |
| `POST /v1/rooms/:roomId/messages` | Agent API key | External bot posts a full message |
| `POST /v1/rooms/:roomId/messages/stream` | Agent API key | External bot streams tokens (NDJSON/SSE) |
| `POST /internal/runs/:runId/stop` | Service JWT | Cancel an in-flight generation |
| `WS /collab` | Supabase JWT | Hocuspocus canvas sync |

### Realtime channel `room:{id}` (Broadcast events, zod-validated in `@mesh/core`)
- `message.delta`: `{messageId, seq, delta}`
- `message.done`: `{messageId, status}`
- `turn.state`: `{sessionId, activeAgentId, queue[]}`
- `tool.approval_requested`: `{toolCallId, agentId, toolName, args}`
- `tool.approval_resolved`: `{toolCallId, status}`

---

## 7. UI (apps/web)

| Route | Contents |
|---|---|
| `/login` | Supabase Auth: magic link and GitHub OAuth |
| `/onboarding` | Create the first org |
| `/[org]` | Room sidebar (public, private, DMs), create room |
| `/[org]/r/[roomId]` | Resizable split. **Chat:** message list, streaming bubbles, presence avatars, typing indicator, `@` autocomplete, approval cards, collapsible sandbox logs, thread sheet, turn queue indicator, stop button. **Canvas:** tabs per canvas, TipTap/Monaco, live preview iframe, version history |
| `/[org]/r/[roomId]/settings` | Turn mode, debate order, moderator, turn cap, RPM, budget, system directive, room agents |
| `/[org]/agents` | Agent builder (provider key, model, prompt, params, tools) with a "test" button |
| `/[org]/settings/keys` | BYOK vault: add, test, delete. The key is never returned after save; only `last4` is shown. |
| `/[org]/settings/tools` | MCP registry, inspector (list tools, invoke with JSON args), dangerous-tool flags |
| `/[org]/settings/bots` | External bots: webhook URL, secret, API keys, delivery log |
| `/[org]/settings/pricing` | Per-model token prices used for budgets and analytics |
| `/[org]/analytics` | Tokens, cost, TTFT and latency by room, agent and day |
| `/[org]/admin` | Members and roles, audit log viewer, SSO config (behind a flag) |

On mobile, a tab switch replaces the split view (chat ↔ canvas).

---

## 8. Security

- **BYOK:**
  - AES-256-GCM with a fresh IV per secret.
  - `MESH_KEK` (32 bytes, base64) exists only in server and orchestrator env.
  - Decryption happens only in the orchestrator and in the `testProviderKey` server action.
- **Secret redaction:** a regex pass covers AWS (`AKIA…`), OpenAI and Anthropic (`sk-…`), GitHub (`ghp_…`, `github_pat_…`), Slack (`xox…`), Google (`AIza…`), Groq (`gsk_…`), Mesh agent keys, JWTs and PEM private keys. It runs on every agent, bot and tool output before persisting or broadcasting.
- **Sandbox:** E2B microVM, 60 s default timeout, no host credentials passed in.
- **`postgres_inspector`:** a `BEGIN READ ONLY` transaction with `statement_timeout = 10s` and a row limit. The connection string is stored encrypted.
- **Webhooks:** HMAC-SHA256 signatures, a timestamp tolerance of 5 min, and an SSRF guard that blocks private IP ranges unless the self-hosted flag is set.
- **Agent API keys:** shown once and stored as a sha256 hash with a short prefix for lookup.
- **Audit logs:** key changes, role changes, tool approvals, API key issue/revoke, and room setting changes.

---

## 9. Environment Variables (`.env.example`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # publishable key
SUPABASE_SERVICE_ROLE_KEY=            # secret key (server/orchestrator only)
DATABASE_URL=                         # session pooler connection string (pg-boss + Drizzle)

# Mesh
MESH_KEK=                             # openssl rand -base64 32
ORCHESTRATOR_URL=http://localhost:4000
NEXT_PUBLIC_COLLAB_URL=ws://localhost:4000/collab
ORCHESTRATOR_INTERNAL_SECRET=

# Dev fallback model (OpenAI-compatible endpoint)
DEV_OPENAI_COMPAT_BASE_URL=
DEV_OPENAI_COMPAT_API_KEY=
DEV_OPENAI_COMPAT_MODEL=

# Optional (Phase 3)
E2B_API_KEY=
BRAVE_SEARCH_API_KEY=
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=
```

---

## 10. Milestones

Each milestone ends with typecheck, lint and tests green, plus a manual check.

### M1: Phase 1, real-time chat core
1. Monorepo scaffold: Turborepo, `create-next-app`, shadcn init, workspace packages, prettier/eslint, `.env.example`.
2. `@mesh/core`, pure logic with unit tests:
   - zod types and room events
   - mention parser
   - redaction
   - repetition detector
   - breakers and cost
   - turn planner
   - canvas patch planner
3. `@mesh/db`: Drizzle schema, migrations and RLS SQL, applied to the user's Supabase project.
4. Supabase Auth with SSR cookies (`@supabase/ssr`), onboarding, org and room CRUD.
5. Realtime chat: send, `postgres_changes` feed, presence, typing.
6. `@mesh/llm` provider registry for OpenAI, Anthropic, Gemini and OpenAI-compatible, with an env fallback for dev.
7. Orchestrator: pg-boss worker, sequential mention coordinator, delta broadcast, and Streamdown rendering of the streaming bubble.

### M2: Phase 2, canvas and BYOK
8. Split canvas: Hocuspocus server with Postgres persistence, TipTap and Monaco collaboration, preview iframe, versions.
9. Agent tools `canvas_write` and `canvas_patch`.
10. BYOK vault: encrypt, test, delete; agents bound to keys.
11. Custom endpoints (Ollama, vLLM, LM Studio, any OpenAI-compatible base URL) with a connection test.
12. Threads and room system directives.

### M3: Phase 3, tools, sandbox and guardrails
13. MCP client registry and inspector. Built-in tools:
    - `web_search`
    - `github_bridge`
    - `postgres_inspector`
14. E2B `code_sandbox` (Python, Node, Bash). Output is shown as a collapsible log block.
15. Debate mode and moderated mode.
16. Circuit breakers wired end-to-end: turn cap, RPM, daily budget, repetition. Halt messages posted.
17. Human approval flow for dangerous tools.

### M4: Phase 4, open bot gateway and hardening
18. Agent API keys, signed webhooks with retries and a delivery log, message and stream endpoints. `examples/python-bot`.
19. Role enforcement across actions, and audit logs. SAML SSO is wired behind a flag; it needs a Supabase Pro plan.
20. PWA: Serwist, installable, offline shell, outbox replay. Mobile layout.
21. Analytics dashboard (tokens, cost, TTFT, latency).
22. Deployment docs: web on Vercel; orchestrator on Fly.io, Railway or a VPS, since it needs long-lived connections.

---

## 11. Verification

**Automated**
- `pnpm turbo typecheck lint test`. Vitest covers:
  - mention parsing (order, `@all_bots`, code-block exclusion)
  - turn planner, all three modes plus bot follow-ups
  - every breaker
  - repetition detector
  - redaction patterns
  - AES-GCM round-trip
  - webhook signature sign/verify
  - canvas patch planning (unique match, multi-match error, sequential splices)
  - coordinator runs against AI SDK mock models (deterministic streams)
- Playwright e2e:
  - two users chatting in one room
  - mention queue streams sequentially
  - turn-cap halt (cap = 1)
  - tool approval approve and reject

**Manual / live**

`pnpm dev` runs web on :3000 and the orchestrator on :4000. Checks:
- Two browser profiles see each other's messages, presence and typing.
- `@BotA @BotB` against the OpenAI-compatible model streams one after the other, never interleaved.
- A canvas edit syncs between tabs within about 100 ms, and an agent `canvas_patch` appears live without overwriting a concurrent human edit.
- Debate mode with 3 agents produces producer → critic → summarizer, then stops.
- Setting a budget of $0.0001 posts a halt system message, and no new `agent_runs` row appears.
- `examples/python-bot` receives a signed webhook and streams a reply into the room.

---

## 12. What's Needed From You

| Item | Needed for |
|---|---|
| Supabase project URL, publishable key, secret key, `DATABASE_URL` (session pooler) with Realtime enabled | M1 step 3 onward |
| OpenAI-compatible base URL, API key and model id | M1 step 7 (live streaming check) |
| `E2B_API_KEY` | M3 sandbox |
| Brave/Tavily search key (optional) | M3 `web_search` |
| GitHub OAuth app (optional) | GitHub login and `github_bridge` |

I generate `MESH_KEK` locally.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| New major versions (AI SDK 7, pg-boss 12, Next 16, Vitest 5) differ from known APIs | Check installed type definitions before each integration; keep adapters thin in `@mesh/llm` and in the orchestrator |
| Supabase Realtime broadcast rate limits during heavy streaming | Batch deltas (~40 ms) and persist partials so clients can recover from the DB |
| Model prices go stale | Prices live in an admin-editable `model_pricing` table, not hard-coded |
| Moderator mode loops | It goes through the same breakers as every other mode, with the turn cap as the hard stop |
| Supabase SAML SSO needs the Pro plan | Wired behind a flag and documented |
| Orchestrator can't run on Vercel | Deploy it separately (Fly.io, Railway or a VPS); web proxies `/api/v1/*` to it |

---

## 14. Current Progress

**Done**
- `git init`
- Root config: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.prettierrc`
- `packages/core` manifest and tsconfig
- `packages/core/src/`: `types.ts`, `mentions.ts`, `redact.ts`, `repetition.ts`

**Not yet written** (paused at your request)
- `packages/core/src/`: `turns.ts`, `breakers.ts`, `patch.ts`, `index.ts`, and the unit tests
- Everything from M1 step 3 onward
