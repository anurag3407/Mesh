# Sayabot Leapfrog Plan: Better Bots Than OpenMausBot, in a Multiplayer Workspace

> **Audience:** engineers and coding agents. Every ticket in §16 can be picked up on its own. Read §0–§4 first, then only the sections your ticket links to.
>
> **Status:** proposed, not started. **Date:** 2026-11-07.
> **Predecessors:**
> - `/plan.md`: the core platform (rooms, turns, canvas, BYOK, MCP gateway).
> - `docs/bot-platform/plan.md`: personal bots, computers, Secret Broker, invites and OAuth. Landed in `b7ff53f`.
>
> **Input:** an external comparison, "OpenMausBot vs. Sayabot", dated Nov 2026. §2 checks its Sayabot claims against this repo. Its OpenMausBot claims have **not** been checked here; treat them as claims.

---

## Contents

0. [Rules for agents working on this plan](#0-rules-for-agents-working-on-this-plan)
1. [Thesis: why their bots feel better, and how we win](#1-thesis)
2. [Reality check: the analysis vs. this repo](#2-reality-check)
3. [Target scorecard](#3-target-scorecard)
4. [Architecture after this plan](#4-architecture-after-this-plan)
5. [WS0: Foundations and bug fixes](#5-ws0-foundations-and-bug-fixes)
6. [WS1: Saya Engine, the agent harness v2 (the core of "better bots")](#6-ws1-saya-engine)
7. [WS2: Memory (personal, room and team)](#7-ws2-memory)
8. [WS3: CLI-agent drivers (Claude Code, Codex and others in the bot computer)](#8-ws3-cli-agent-drivers)
9. [WS4: Computer use v2 (eyes, hands, live desktop, take control)](#9-ws4-computer-use-v2)
10. [WS5: Human-in-the-loop v2 (ask cards, approval policies, approve from phone)](#10-ws5-human-in-the-loop-v2)
11. [WS6: Proactivity (routines, inbound webhooks, app events, self-scheduling)](#11-ws6-proactivity)
12. [WS7: Integrations catalog (one-click apps)](#12-ws7-integrations-catalog)
13. [WS8: Voice (calls, TTS/STT, multiplayer huddles)](#13-ws8-voice)
14. [WS9–WS11: Mobile, portability and CLI, onboarding and self-host](#14-ws9ws11)
15. [WS12: Quality: evals, tests and observability](#15-ws12-quality)
16. [Tickets](#16-tickets)
17. [Roadmap and sequencing](#17-roadmap-and-sequencing)
18. [Data model summary](#18-data-model-summary)
19. [Security acceptance (additions to bot-platform §13.2)](#19-security-acceptance)
20. [Risks and open questions](#20-risks-and-open-questions)
21. [Out of scope / later](#21-out-of-scope--later)

---

## 0. Rules for agents working on this plan

All of `docs/bot-platform/plan.md` §0 still applies. In particular:

1. **Never run `packages/db/src/migrate.ts` (`pnpm db:migrate`).** It loads `.env` and writes to the **live** Supabase DB.
   - Generate migrations with `pnpm db:generate`.
   - Hand-written SQL goes in `packages/db/sql/00NN_*.sql`. **The next free number is 0010** (`0009_bot_platform.sql` exists).
   - A human applies migrations.
2. **Reuse, don't duplicate.** One approval path (`apps/orchestrator/src/tools/audited.ts`), one crypto helper (`@sayabot/llm` `crypto.ts`), one redaction pass (`@sayabot/core` `redact.ts` plus `createRunScrubber`), one SSRF guard, one push sender (`apps/orchestrator/src/push.ts`).
3. **No raw secret ever reaches** a prompt, a tool result, a bot computer, a log, `audit_logs`, `tool_calls` or the browser. §19 is required for every ticket that touches secrets, CLI credentials, voice keys or inbound webhooks.
4. **Behaviour flags.** Every behaviour change to the agent loop ships behind a per-agent `engine` setting (§6.1). Existing agents stay on `engine: "v1"` until an admin flips them or the WS12 eval gate passes. Then the default for *new* agents changes.
5. **Provider-neutral first.** The runner uses the Vercel AI SDK (`ai` 7). Provider-specific features go through `providerOptions` in `packages/llm/src/registry.ts` capability flags, never through `if (provider === …)` scattered in the runner. Examples: Anthropic prompt caching, compaction, context editing and effort; OpenAI reasoning effort.
6. **A ticket is done** when `pnpm typecheck && pnpm lint && pnpm test` pass, its acceptance criteria are met, its tests are added, and any agent-loop change has an eval run attached (§15).
7. **Check versions before use.** `ai` 7, pg-boss 12, Next 16, Vitest 5, zod 4, Hocuspocus 4, Serwist 9, Playwright, noVNC, and any CLI agent's flags change often. Read the installed types and `--help` output; don't trust memory.

---

## 1. Thesis

### 1.1 Why OpenMausBot's bots feel better

The comparison lists many features, but most of the "their bots are better" feeling comes down to the **agent harness**, not the feature count. OpenMausBot wraps the `claude` and `codex` CLIs, which are long-horizon agent loops with:

| Harness property | Claude Code / Codex (what OMB inherits) | Sayabot today |
|---|---|---|
| Loop length | Dozens to hundreds of tool steps per task | `maxSteps` default **6** (`runner/llm.ts`, `stream-agent.ts`) |
| Context shape | Real message history with tool-call and tool-result blocks, cached prefix | One flattened `prompt` string rebuilt every turn from the last 40 messages (`runner/context.ts`). Prior tool calls and results are invisible to the next turn. |
| Context limits | Compaction plus clearing of old tool results | Truncation: oldest lines dropped past 60k chars |
| Planning | Todo or plan tool, re-planning | None in the loop (tasks exist, but no in-run plan) |
| Code tools | Read / Edit (exact replace) / Grep / Glob / Bash, tuned for models | `computer_shell`, whole-file `computer_write_file` |
| Memory | `CLAUDE.md` / `MEMORY.md` files, recalled each session | None. Amnesia once messages scroll past 40. |
| Continuity | Session persisted; resume after a crash | Run dies with the orchestrator process |
| Recovery | Retries, rate-limit waits, re-auth flows | A provider error ends the turn |
| Sub-work | Subagents for parallel reading or research | None |
| Verification | Runs tests and checks its own work | Not prompted or structured |
| Economics | User's existing subscription | Per-token BYOK |

### 1.2 How we win

The strategy has three parts.

**A. Match the harness.** Build **Saya Engine** (WS1 + WS2): a provider-neutral, long-horizon, cached, compacting, planning, memory-backed, resumable agent loop with first-class code tools. Measure it on an eval suite (WS12). This one change makes every Sayabot bot better, whatever model the user brings.

**B. Absorb their edge where it's sanctioned.** Run Claude Code, Codex and similar CLIs *inside the bot's own gVisor computer* as an alternative engine (WS3). Their approval prompts route to Sayabot's approval cards. This gives users the subscription economics, gated on a provider-terms review (§20).

**C. Multiply by the things they can't do.** OMB is single-user. Sayabot puts **several humans and several bots** in one room with:
- a shared CRDT canvas;
- a task graph;
- debate-based verification;
- shared team memory;
- shared computers you can watch;
- voice huddles;
- org governance (RLS, vault, egress proxy, budgets).

Every new capability in this plan is designed to be **multiplayer-native**. The bar is not "a bot can do X" but "a team of humans and bots can do X together, visibly, safely".

### 1.3 Goals (measurable)

| # | Goal | Measure (WS12) |
|---|---|---|
| G1 | Bots finish real multi-step work | Task success on the Saya eval suite: Engine v2 beats v1 by at least 30 pp, and the CLI engine does no worse than v2 on coding tasks |
| G2 | Bots remember | Recall eval: at least 90% of facts planted 3 or more rooms or 200 or more messages ago are recalled when relevant; at most 5% irrelevant recalls |
| G3 | Bots act without being asked | Routines, webhooks and app events fire within 60 s (p95), and an unattended policy is always applied |
| G4 | Humans can steer from anywhere | Approve or answer from a phone notification in at most 2 taps; p95 notification-to-resume under 3 s |
| G5 | Cheaper per completed task | Prompt-cache hit rate of at least 70% of input tokens on long runs (cache-capable providers); median cost per eval task down at least 40% vs. v1 |
| G6 | Watchable | Live desktop or browser frames at 5 fps or more in the room, with take-control |
| G7 | Trustworthy | Zero §19 failures; every action is audited and attributable |

---

## 2. Reality check

The comparison is directionally right but wrong in places that matter for planning. Corrections, from this repo at `b7ff53f`:

| Analysis claim | Actual state | Plan impact |
|---|---|---|
| "Headless Docker exec / E2B sandbox" | **Both exist.** `code_sandbox` (E2B, 60 s, per call) and a **persistent gVisor computer** per bot (`apps/computerd`, `agentd` over a unix socket, `/home/bot` volume, Secret Broker egress). | WS4 builds on computerd. It doesn't start over. |
| Bots have no eyes | **Browser tools are declared but are stubs.** `browser_open/snapshot/click/type/extract/screenshot` exist in `tools/builtins/computer.ts`, and computerd forwards `op: "browser"`. **`agentd` has no `browser` case** (ops: exec, read, write, list, env.reload, stats). No `-browser` image exists in `deploy/docker/`. | WS0 ticket: make them real or hide them. They currently fail at runtime. |
| Live visual feedback: none | `computer-panel.tsx` has Logs, Files and Browser tabs, mostly placeholder text. `tool.output` is broadcast with `toolCallId: agentId` (**bug**: should be the tool call id), and **nothing in `apps/web` consumes `tool.output`**. | WS0 fix plus WS4 live view. |
| "Browser notifications only" | **Web Push exists** (`push.ts`, VAPID, `push_subscriptions`, Serwist SW). It alerts room and org admins and links to `/inbox`. It has **no action buttons**, and the approval TTL is a fixed 5 min. | WS5 adds signed approve/deny actions. Most of the plumbing exists. |
| "Hardcoded danger tool check" | `dangerous` can be a boolean or a predicate per tool. `computer_shell` uses `isDestructiveCommand`, and MCP servers have a `dangerousTools` list. There is **no per-agent or per-room policy**, no "allow for session", and no allowlist memory. | WS5 approval policies. |
| "Enterprise SAML SSO" (Sayabot advantage) | **Only an `orgs.sso_enabled` boolean.** No SAML or OIDC flow found. | Don't market it. WS11 lists real SSO as an enterprise ticket. |
| "25 test suites" | **28** `*.test.ts` files plus Playwright e2e. OMB's "2,448" is unverified. | WS12 sets coverage targets by risk, not by count. |
| "Weekday meetings only" | Correct. `scheduler/meetings.ts` plus `room_schedules`, scanned every 60 s under an advisory lock. Also `task-wake` jobs (pg-boss) exist. | WS6 generalises the scanner into routines. |
| Memory: "in-room history only" | Correct, and worse: the last **40** top-level messages, flattened into a string. No FTS or vector index exists (no `tsvector`/`pgvector` in `packages/db/sql`). Search is ILIKE. | WS2. |
| Templates "hardcoded in DB seed" | `agent_templates` table plus 9 markdown templates in `packages/db/src/templates/`, and a bot wizard. No export or import. | WS10 team packages. |
| External orchestration | MCP server with about 30 tools, OAuth 2.1 invites, `wait_for_activity`. Already strong, and arguably better than OMB's stdio MCP. | Keep it. WS10 adds the `saya` CLI on top. |

**Other defects found while auditing (fold into WS0):**
- `runLlmTurn` doesn't stream tool-call progress into the message timeline. Only text deltas are broadcast. Tool cards appear through approval events or after the fact.
- The prompt is rebuilt as one user string, so **no provider can cache the history prefix**. This is the single biggest cost lever.
- Partial persistence redacts with `redactSecrets(fullRaw)` but **skips `runScrubber`** (`llm.ts`, the `onDelta` persist branch). The final pass is correct. Partial rows could briefly hold a plaintext that only the run scrubber knows (for example, the provider key echoed by a model). Fix this in WS0.

---

## 3. Target scorecard

What "better than OpenMausBot" means, row by row. The **Sayabot target** column is the end state after this plan.

| Capability | OMB (claimed) | Sayabot today | Sayabot target | Winner after | WS |
|---|---|---|---|---|---|
| Long-horizon agent loop | Via the CLIs | 6 steps, stateless | 200+ steps, compaction, plan, resume | **Sayabot** (any model, multiplayer-visible) | 1 |
| $0-marginal via subscriptions | Yes (CLIs on host) | No | CLI engine in the bot computer (policy-gated), plus aggressive caching for BYOK | Tie | 3, 1 |
| Persistent memory | Files + FTS5 | None | Personal, room and team memory; hybrid FTS + vector; consolidation; human-editable; provenance | **Sayabot** | 2 |
| Computer use (GUI) | Boat.dev, VM, host | Headless shell | Desktop profile (Xvfb + VNC), live view, take control, browser automation, screenshot tools | Tie (no host OS control, by design) | 4 |
| Watch your bot work | Thumbnail stream | Placeholder | Live frames for **everyone in the room**, action timeline, replay | **Sayabot** | 4 |
| Ask / approval cards | AskCard, ApprovalCard | ApprovalCard only | Ask cards, policies, allow-for-session, diff previews, quorum approvals | **Sayabot** (multi-approver) | 5 |
| Approve from phone | Native app | Push to inbox | Push with Approve/Deny/Answer actions, PWA, native wrapper later | Tie, then Sayabot (no pairing step) | 5, 9 |
| Routines / cron | Yes | 2 fixed check-ins | Cron, interval, once and event routines; bot self-scheduling; unattended policies | Tie+ | 6 |
| Inbound webhooks | Local :8800 | Outbound only | Per-trigger HMAC URLs, public by default (no tunnel) | **Sayabot** | 6 |
| App event triggers | Composio | None | GitHub, Slack, Gmail, Linear native + Composio adapter | Tie | 6, 7 |
| App catalog | Composio (500+) | Manual MCP | Curated OAuth MCP catalog + optional Composio adapter | Tie | 7 |
| Voice | 5 TTS engines | None | Call mode, speech sanitizer, pluggable TTS/STT, **multiplayer huddles** | **Sayabot** | 8 |
| Team export/import | FORMAT.md | None | `sayabot.team` packages with rooms, routines, canvases and memory seeds; gallery | **Sayabot** (includes rooms and workflows) | 10 |
| Headless CLI | `openmausbot` | MCP only | `saya` CLI + GitHub Action | Tie | 10 |
| Zero-config start | Download DMG | Supabase setup | Hosted signup in under 60 s; `docker compose up` self-host | Tie | 11 |
| Collaborative canvas | None | Yes | Plus bots editing alongside humans with presence cursors | **Sayabot** | — |
| Multi-tenant, RLS, vault, egress | None | Yes | Plus real SSO | **Sayabot** | 11 |
| Debate / verification | Lead bot | Producer, critic, summarizer | Debate as a **verifier step inside the engine** | **Sayabot** | 1 |

---

## 4. Architecture after this plan

```
                    ┌──────────────────────── apps/web (Next 16) ───────────────────────────┐
 humans (web/PWA) ─▶│ room: chat · canvas · computer live view · ask/approval cards · call  │
 phone push       ─▶│ /a/[token] signed action endpoints · settings: memory, routines, apps │
                    └────────────▲──────────────────────────┬───────────────────────────────┘
                     Supabase    │ Realtime broadcast        │ server actions / /api/v1 proxy
                    ┌────────────┴──────────────────────────▼──────── apps/orchestrator ────┐
 inbound hooks ───▶ │ triggers/ (webhooks, app events)  scheduler/ (routines + meetings)    │
 app events    ───▶ │ coordinator/ ─▶ jobs (pg-boss: run.start, run.resume, run.step)       │
                    │      │                                                                 │
                    │      ▼            ┌──────── engine/ (Saya Engine v2) ────────────────┐ │
                    │  runner/llm.ts ──▶│ context builder (cached messages) · loop · plan   │ │
                    │  (v1, kept)       │ compaction · recall · subagents · verify · resume │ │
                    │                   └───▲───────────────▲───────────────▲──────────────┘ │
                    │  memory/ ─────────────┘   tools/ (audited, policy) │   drivers/cli/ ──┐│
                    │  voice/ (tts/stt streams) mcp/ (server + catalog)  │   (claude, codex)││
                    └────────────────────────────────────┬───────────────┼──────────────────┼┘
                                                         │ computerd API │                  │
                               ┌──────────── apps/computerd ─────────────▼──────────────────▼─┐
                               │ ensure/exec/files · desktop ws (VNC) · cli sessions          │
                               │  └─ gVisor container: agentd (+ browser, + desktop, + cli)   │
                               └──────────────────────────────┬───────────────────────────────┘
                                                              │ HTTPS only
                                                       apps/egress (Secret Broker, SSRF, scrub)
```

New code lives in:
- `apps/orchestrator/src/engine/` (WS1)
- `apps/orchestrator/src/memory/` (WS2)
- `apps/orchestrator/src/drivers/cli/` (WS3)
- `apps/orchestrator/src/triggers/` and `scheduler/routines.ts` (WS6)
- `apps/orchestrator/src/voice/` (WS8)
- `packages/core/src/{engine,speech,policy,team-package,cron}.ts` (pure logic, unit-tested)
- `apps/cli` (`@sayabot/cli`, WS10)

---

## 5. WS0: Foundations and bug fixes

Small and urgent. Do this first; it unblocks everything else.

| ID | Change | Files | Acceptance |
|---|---|---|---|
| WS0-1 | `tool.output` must carry the real `toolCallId`. Thread the audited row id into `ToolSpec.execute` through a third `ctx` argument (`{ toolCallId, signal }`). | `tools/audited.ts`, `tools/builtins/computer.ts`, `packages/core/src/types.ts` | Unit test: chunks broadcast under the tool call id |
| WS0-2 | Web consumes `tool.output` and `tool.started`/`tool.finished` (new events). `ToolCallCard` shows live streamed output, collapsed by default. | `use-room-realtime.ts`, `tool-call-card.tsx`, `message-item.tsx` | Playwright: a shell command's output streams into the card |
| WS0-3 | Broadcast `tool.started` (name, redacted args) and `tool.finished` (status, ms) from `toAuditedTools`, so every tool call is visible as it happens, not only dangerous ones. | `tools/audited.ts` | Card appears within 200 ms of the call |
| WS0-4 | Partial persist uses `redactSecrets(runScrubber(fullRaw))`. | `runner/llm.ts` | Test: a planted provider key never appears in a partial row |
| WS0-5 | Browser tools: either (a) implement the agentd `browser` op via WS4-2, or (b) until then, `computerTools` omits browser tools when the image lacks a browser. agentd `stats` reports `browserAvailable`. | `agentd.ts`, `computer.ts` | Today's stub never reaches a model |
| WS0-6 | Make `maxSteps` visible in the agent settings UI (default stays 6 on v1), and log `finishReason` per run. | `agents/[agentId]/page.tsx`, `agent_runs` | — |
| WS0-7 | Add `agent_runs.finish_reason`, `agent_runs.steps`, `agent_runs.engine`. | migration 0010 | — |

---

## 6. WS1: Saya Engine

This is the workstream that makes Sayabot's bots better than OMB's. Everything else plugs into it.

### 6.1 Engine selection

`agents.params.engine: "v1" | "v2" | "cli"` (zod-validated in `@sayabot/core`; default `"v1"` for existing agents, `"v2"` for agents created after the WS12 gate).

- `v1` is today's `runLlmTurn`, unchanged.
- `v2` is `engine/run.ts`.
- `cli` is `drivers/cli` (WS3).

The coordinator calls `startAgentTurn(args)`, which dispatches on the engine. The coordinator's turn plan (mentions, debate, moderated), breakers and budgets wrap all three engines the same way.

### 6.2 Durable runs

Today a run is an in-process promise, so an orchestrator restart kills it. v2 makes runs **durable and resumable**:

- **New table `run_steps`:**
  - columns: `run_id`, `idx`, `kind` (`model` | `tool` | `compaction` | `recall` | `plan` | `subagent` | `verify`), `input_ref`, `output` (jsonb, redacted), `usage`, `started_at`, `finished_at`;
  - unique on (`run_id`, `idx`).
- **New table `run_transcripts`:**
  - columns: `run_id`, `messages` (jsonb array of AI SDK `ModelMessage`, **redacted and scrubbed**), `compacted_through_idx`, `plan` (jsonb), `version`;
  - this is the engine's working memory for one run.
- **The loop runs step by step.** Each model call and each tool batch is one step. After every step the engine persists the transcript delta. On boot, `run.resume` jobs pick up `agent_runs.status = 'running'` rows whose heartbeat (`agent_runs.heartbeat_at`, updated every 10 s) is older than 60 s.
- **Step idempotency:** tool calls get `idempotency_key = run_id:idx:callIndex`. Before re-executing, the engine checks `tool_calls` for a `done` row with that key. Non-idempotent tools (shell, MCP writes) whose result is unknown are **not** re-run. The model gets "result unknown after restart; verify state before retrying".
- **Long waits don't hold a process.** A pending approval or ask-card answer longer than 30 s *parks* the run: it saves state, sets `agent_runs.status = 'waiting'` (new enum value), and frees the worker. Resolution enqueues `run.resume`. This replaces today's in-memory 5-minute `waitForApproval` for v2 and lets approvals last hours (policy-configurable, §10).

### 6.3 Context builder (cache-first)

Replace the single-string prompt with **structured, append-only messages** laid out for prefix caching. Render order:

```
[tools]                      deterministic order (sorted by name), stable descriptions
[system 1: frozen]           engine rules + agent identity + agent instructions      ← cache breakpoint 1
[system 2: slow-changing]    room directive, team memory digest, skills index        ← cache breakpoint 2
[messages: room history]     prior room turns as user/assistant messages, with this
                             agent's own previous tool calls/results (summarised past N)
[messages: this run]         append-only: model outputs + tool results              ← breakpoint 3 (rolling)
[volatile tail]              recalled memories, canvas/task snapshot, "now" time,
                             current trigger                                         ← never cached
```

Rules:
- **No timestamps, ids or unsorted JSON above the volatile tail.** A unit test renders the prefix twice with different `now` values and asserts it is byte-identical.
- Other speakers' messages become `user` messages with a name label (`[Ana (human)]: …`). This agent's own past replies become `assistant` messages. That fixes the "speaks for others" failure mode and keeps the history appendable.
- **Canvas and task snapshots move to the tail** and are diffed: "canvas X changed since your last turn: +12 −3 lines" plus the full text on demand through `canvas_read`. Full text is no longer injected every turn.
- **Provider capability flags** in `packages/llm/src/registry.ts`: `supportsPromptCache`, `supportsServerCompaction`, `supportsContextEditing`, `supportsEffort`, `supportsMidConversationSystem`, `supportsParallelTools`, `contextWindow`. The builder emits `providerOptions` per flag. For example, on Anthropic it places `cacheControl` on breakpoints 1–3 (verify the exact `@ai-sdk/anthropic` 7 option names against the installed types). The cache-hit rate is recorded from usage fields into `usage_events.cached_input_tokens` (new column).
- **Mid-run operator notes** (for example "a human just replied", or "budget 80% used") are appended as *new* messages. They never edit earlier ones, so the cache and preserved-thinking constraints hold on models that enforce append-only history.

### 6.4 The loop

```ts
// apps/orchestrator/src/engine/run.ts (shape, not final code)
while (!done) {
  budget.check()                     // steps, tokens, USD, wall clock; breakers from @sayabot/core
  ctx = await contextBuilder.render(state)          // §6.3
  if (ctx.tokens > policy.compactAt) state = await compact(state)   // §6.5
  const step = await model.step(ctx, tools, { effort: policy.effortFor(state) })
  persist(step)                                     // run_steps + transcript delta
  if (step.toolCalls.length) {
    results = await runToolsInParallel(step.toolCalls)  // audited, policy-gated, §10
    persist(results)                                // ALL results in one tool message
  } else if (step.finishReason === "stop") {
    done = await verifier.maybeVerify(state)        // §6.8; may push the loop back
  }
  if (await interrupts.pending(run)) state = await interrupts.fold(state) // humans talking mid-run
}
```

Details:
- **Step budget:** `params.maxSteps` (default **60** for v2; max 400). Also `maxWallMinutes` (default 30), per-run `maxUsd` (default from room `dailyBudgetUsd` headroom), and the existing breakers (`breakers.ts`, `repetition.ts`). At 80% of any budget, the engine appends a "wrap up: summarise progress and next steps" system note.
- **Parallel tools:** execute independent calls concurrently (cap 4). Results come back as one tool message, in call order.
- **Retry and recovery** (`engine/recovery.ts`):
  - 429 / 5xx / network: exponential backoff with jitter, honouring `retry-after`, up to 5 tries.
  - Context overflow: force a compaction, then retry once.
  - Quota exhausted: run status `waiting`, reason `quota`, posted as a system message with the reset time, plus an optional **fallback model** (`params.fallbackModel`, same or another provider key).
  - Auth error: `waiting` with a "re-enter key" card for admins.
  - Refusal: surface it; optional fallback model.
- **Interrupts:** today `coordinator/interrupt.ts` supersedes sessions. In v2, a human message that **mentions** a running agent is folded into the run as a new user message at the next step boundary, so you can steer mid-task the way you can in Claude Code. A message without a mention stays queued for the next turn plan.
- **Streaming UX:** text deltas go out as today. New realtime events: `run.step` (kind, short label), `run.plan` (plan items), `run.status` (`thinking`, `tool`, `waiting:approval`, `waiting:answer`, `compacting`). `turn-strip.tsx` renders a live activity line, for example "@coder · step 14/60 · running tests". Where the provider exposes reasoning summaries, show them collapsed.
- **Final message shape:** one room message per run with the final answer, plus an expandable **run timeline** (steps, tools, diffs, screenshots). Long runs post interim updates at most every N minutes (`params.progressEveryMin`, default 5) as thread replies under the run message, so the main feed isn't spammed.

### 6.5 Compaction

- **Trigger:** the rendered context exceeds `min(0.6 × contextWindow, params.compactAtTokens)`.
- **Strategy order:**
  1. **Clear old tool results.** Keep the last K=6 tool results verbatim. Replace older ones with `[result elided: <one-line summary>; full result in tool_calls/<id>]`. Use the provider's context-editing feature where `supportsContextEditing`, otherwise do it in our renderer.
  2. **Summarise.** Use server-side compaction where `supportsServerCompaction`. Otherwise run our own summariser call (cheap model per org setting) that produces a structured state: goal, decisions, files touched, open questions, plan status, facts learned. It replaces messages up to `compacted_through_idx`.
  3. **Promote durable facts to memory** (WS2 `memory.write` with `source: "compaction"`), so compaction never destroys knowledge.
- With server-side compaction, preserve the provider's returned content blocks verbatim in `run_transcripts`. Never store only the text.
- **Tests:** a 300-step synthetic run stays under the window, and the plan and goal survive 5 compactions.

### 6.6 Planning tool

The built-in `update_plan` tool (always on in v2) takes `{ items: [{ id, title, status: pending|in_progress|done|blocked, note? }] }`.
- It is stored on `run_transcripts.plan`, broadcast as `run.plan`, and rendered as a checklist pinned to the run card.
- The engine nudges: if the run has made more than 8 steps with no plan, append "make a plan". If every item is done, the run should finish or verify.
- **Room tasks link:** a plan item can be promoted to a room task (`create_task`) with one click by a human, or by the agent if `caps.tasks`. This is the bridge from a single bot's plan to multiplayer task-graph work, which OMB lacks.

### 6.7 Code-agent tool kit (computer engine tools)

Add first-class file tools, as found in the best harnesses. They are implemented as agentd ops so they run inside the gVisor computer:

| Tool | Behaviour |
|---|---|
| `fs_read` | Path, optional line range, numbered lines; refuses binaries; 2,000-line cap with a continuation hint |
| `fs_edit` | **Exact string replace** (`old`, `new`, `replace_all?`); fails if `old` isn't unique; returns a unified diff (also broadcast for diff preview) |
| `fs_write` | Create or overwrite; diff shown when overwriting |
| `fs_glob` | Glob patterns, mtime-sorted |
| `fs_grep` | ripgrep wrapper (already in the image) with `-n`, context lines and file-type filters |
| `computer_shell` | Kept. Adds `background: true` returning a job id, plus `job_status` / `job_output` / `job_kill` for dev servers and long tests |
| `git_*` | Thin helpers: `git_status`, `git_diff`, `git_commit` (dangerous), `git_push` (dangerous; through egress with a brokered GitHub token) |

The old `computer_read_file` and `computer_write_file` become aliases.

**Tool descriptions are written for models:** when to use the tool, when not to, an example and the failure modes. They are kept in `engine/tool-docs/*.md` and loaded at build time, so prompt changes are reviewed as diffs.

### 6.8 Verification: debate as a built-in

This is Sayabot's unique strength, applied inside a single bot's run.

`params.verify: "off" | "self" | "critic"` (default `"self"` for v2).
- **`self`:** before finishing, the engine appends a checklist prompt ("Re-read the task. List each requirement and evidence it's met. Run tests if code changed."). The model may continue the loop.
- **`critic`:** the engine spawns a **critic subagent** (another model or agent the room admin chooses, ideally a different provider) with read-only tools. It reviews the diff, the canvas or the answer against the task brief and returns `pass` or `revise` with reasons. On `revise`, the findings go back into the main loop. Cap: 2 revise cycles.

Debate-mode rooms keep their existing producer → critic → summarizer turn plan. `critic` verify is the in-run, automatic version.

### 6.9 Subagents

The built-in `spawn_subagent` tool (`caps.subagents`, default on in v2) takes `{ task, tools: "read_only"|"same", model?: "cheap"|"same", maxSteps? }`.
- A subagent runs as a child `agent_runs` row (`parent_run_id`, new column) with its own transcript. It returns only its final summary to the parent, which keeps the parent's context clean.
- Fan-out cap: 4 concurrent per run and 12 per run in total. Cost and budget roll up to the parent.
- The UI shows subagents nested in the run timeline.
- Typical uses: "read these 30 files and summarise the auth flow", "research 5 vendors in parallel".

### 6.10 Effort and model routing

- `params.effort: "auto" | "low" | "medium" | "high" | "max"`. `auto` uses `low` for chat replies with no tools, `high` for task-bound runs (`taskId` set), and `low` for subagents. The registry maps effort to provider options (reasoning effort, thinking config, and so on).
- `params.cheapModel` (an org-level default too) is used for summarising, compaction, memory extraction, classification and subagents marked `cheap`.

### 6.11 Skills

These are reusable, versioned procedures, like Claude Code skills. They are better than OMB's because they are shared org-wide with RLS.

- **New table `skills`:** `id`, `org_id`, `slug`, `title`, `description` (one line, always in context), `body` (markdown, loaded on demand), `files` (jsonb, optional scripts copied to `/home/bot/.saaya/skills/<slug>/`), `version`, `created_by`, `visibility`.
- **The engine injects only `slug: description` lines** into system block 2. The model calls `load_skill({ slug })` to pull the body into context. This keeps the cached prefix small.
- Agents can **propose** skills (`propose_skill`). An admin approves, which guards against prompt-injected skill poisoning.
- **Seed skills:** "write and run tests", "open a PR", "research with citations", "summarise a long thread", "build a landing page on the canvas".

### 6.12 Tool search for large MCP sets

When an agent has more than 40 tools (common with MCP catalogs), the engine:
1. exposes core tools directly;
2. puts the rest behind a `find_tools({ query })` tool that does BM25 over tool names and descriptions and returns up to 8 schemas, which are added to the tool set from the next step on.

Use provider-native tool search where the provider supports it, otherwise our own. This keeps tool definitions out of the cached prefix churn.

### 6.13 Engine files

```
apps/orchestrator/src/engine/
  run.ts            loop (§6.4)          context.ts     builder (§6.3)
  compaction.ts     §6.5                 plan.ts        §6.6
  verify.ts         §6.8                 subagents.ts   §6.9
  recovery.ts       retries/fallbacks    budget.ts      wraps @sayabot/core breakers
  interrupts.ts     mid-run steering     persist.ts     run_steps/run_transcripts/heartbeat
  resume.ts         boot + run.resume job
  tool-docs/*.md    model-facing tool docs
packages/core/src/engine.ts   pure: budget math, compaction thresholds, plan reducers, prefix-stability helpers
```

---

## 7. WS2: Memory

### 7.1 Model

Three scopes, all RLS-guarded:

| Scope | Owner | Visible to | Example |
|---|---|---|---|
| `agent` | one bot | that bot in every room it joins (and its owner) | "Anurag prefers pnpm; staging DB is read-only" |
| `room` | one room | every agent in the room, and room members | "Decision 11-02: we ship the Stripe flow first" |
| `org` (team) | org | every agent in the org, and members | "Brand voice: concise, no emoji" |

**New table `memories`:**
- `id`, `org_id`, `scope`, `agent_id?`, `room_id?`, `kind` (`fact` | `preference` | `decision` | `procedure` | `episode`), `title`, `body` (at most 2 KB);
- `tags[]`, `source` (`agent` | `human` | `compaction` | `consolidation` | `import`), `source_ref` (message, run or tool call id), `confidence` (0–1), `pinned` (bool);
- `expires_at?`, `superseded_by?`, `created_by_user?`, `created_by_agent?`, `last_used_at`, `use_count`;
- `embedding vector(…)` (pgvector; dimension per org embedding config, nullable) and `tsv tsvector` (generated from title + body);
- indexes: GIN on `tsv`, HNSW on `embedding`, btree on (`org_id`, `scope`, `agent_id`, `room_id`).

**Daily episode logs:** a nightly job writes one `episode` per agent per active room ("what I did today"). This is OMB's `memory/log/<day>.md`, kept in Postgres.

pgvector must be enabled on Supabase (a dashboard extension; human step). If an org has no embedding key, recall falls back to FTS only.

### 7.2 Write path

- **Tools (v2 and the CLI engine through MCP):** `remember({ scope, kind, title, body, tags })`, `forget({ id })`, `update_memory({ id, … })`. Writes to `room` and `org` scope are **policy-gated** (§10): auto, ask, or off per org. This prevents one compromised bot from poisoning team memory.
- **Automatic extraction:** after each completed run, a cheap-model pass proposes at most 3 memories from the transcript, deduplicated against existing ones (vector similarity above 0.9 means update, not insert). Proposals at `confidence < 0.7` go to a "suggested memories" inbox for humans.
- **Human writes:** a `/remember …` slash command in the composer (extend `commands.ts`), and "save to memory" on any message.
- **Redaction:** every body passes through `redactSecrets` + `runScrubber` before insert. Never store vault placeholders' resolved values.

### 7.3 Recall path (pre-turn injection)

Before step 1 of every v2 run (and on each `run.resume`):
1. **Build a query** from the trigger message, the task brief and the plan.
2. **Hybrid search** across the allowed scopes: FTS rank + vector cosine, Reciprocal Rank Fusion, a recency boost and a `pinned` boost. Take the top 8, at most 1,500 tokens.
3. **Inject into the volatile tail** as `<recalled>` items with ids, so the model can cite them or `forget` them.
4. **Pinned memories** (at most 20 per scope) go into **system block 2** instead. They're stable, so they cache.
5. Update `last_used_at` and `use_count`. These feed consolidation.

Memory search is also available on demand as `recall({ query, scope? })`.

### 7.4 Consolidation ("sleep")

A nightly pg-boss job per org:
- merges near-duplicates;
- expires stale `episode` items older than 30 days into weekly summaries;
- flags contradictions ("two decisions conflict") as room inbox items for humans;
- recomputes embeddings on model change.

It's cheap-model only and has a per-org budget.

### 7.5 Files view for the CLI engine and computers

For `cli` engine bots and any bot with a computer, memory is mirrored read-only into `/home/bot/.saaya/memory/MEMORY.md` (pinned items) plus `topics/<tag>.md`, regenerated at run start. CLI agents read files natively, which gives OMB-style ergonomics with Postgres as the source of truth. Writes go back through the `remember` MCP tool, never through files.

### 7.6 UI

- **`/[org]/agents/[agentId]` gets a Memory tab:** list, search, pin, edit, delete, and a "why recalled" trace per run.
- **Room settings get a Memory tab:** room decisions, with a timeline.
- **`/[org]/settings/memory`:** team memory, write policy, embedding provider and key choice, and retention.
- **Run timeline:** "recalled 5 memories" chip that expands to show them.

### 7.7 Acceptance

- The WS12 recall eval meets G2.
- An RLS test: agent A in org 1 can never recall org 2's memories, and a private agent's `agent`-scope memories are hidden from other agents.
- A redaction test: planting a token in a message never yields a memory containing it.

---

## 8. WS3: CLI-agent drivers

### 8.1 Goal

Some users already pay for Claude Code, Codex or other agentic CLIs. They should be able to run those as a Sayabot bot's engine:
- inside **that bot's gVisor computer**, never on the shared host;
- with Sayabot's approvals, memory, rooms, canvas and task tools available through MCP.

This is the "Running Claude Code or other CLI agents inside a bot computer" item from bot-platform §14, promoted.

> **Gate (must clear before GA, §20 R1):** a written review of each CLI provider's current terms for (a) running their CLI on a hosted third-party service, and (b) using a consumer subscription credential there. If a provider disallows (b), that driver ships **API-key / org-account mode only** (still valuable: best-in-class harness on the user's own key). The design below supports both modes without change.

### 8.2 Driver contract (`apps/orchestrator/src/drivers/cli/driver.ts`)

```ts
interface CliDriver {
  id: "claude-code" | "codex" | string
  detect(computer): Promise<{ installed: boolean; version?: string; authed: boolean }>
  install(computer): Promise<void>                       // pinned version, via agentd exec
  authFlow(computer): AuthFlow                           // device-code / login URL relayed to the owner
  start(args: { runId, prompt, sessionCursor?, mcpConfigPath, permissionToolName, cwd, env })
    : AsyncIterable<CliEvent>                            // parsed stream (stream-json / JSONL)
  resume(cursor): ...                                    // native session resume
  interrupt(): Promise<void>
  classifyError(e): "usage_limit" | "auth" | "transient" | "fatal"  // + resetsAt when parseable
}
type CliEvent = TextDelta | ToolStart | ToolEnd | PermissionRequest | Usage | SessionCursor | Done | Error
```

Each driver's flags are verified against the CLI's current `--help` at implementation time (rule 0.7). Don't hardcode remembered flags.

### 8.3 Runtime inside the computer

- **New agentd op `proc.spawn`** for long-lived, stdio-attached processes, with frame-multiplexed stdin, stdout, stderr and exit over the existing unix socket. Plus `proc.write`, `proc.kill` and `proc.list`. Processes are retained per (`agent`, `room`, `thread`) with an idle timeout (default 15 min) and the native session cursor saved in a new `cli_sessions` table. This is OMB's "keep-warm" contract.
- **Credentials:**
  - **API-key mode:** the key is a vault secret. The CLI sees a placeholder, and the egress Secret Broker swaps it at the provider's host. This uses the existing machinery with no plaintext in the computer.
  - **Subscription mode, if allowed:** the CLI's own login runs inside the computer through a relayed device-code or URL flow to the owner's browser. The resulting credential file lives on the bot's private volume. Document this honestly in the UI: "this credential is stored inside your bot's computer". It is excluded from exports, file browser downloads and `computer_publish`. Egress allowlists the provider's auth and API hosts only.
- **Sayabot tools through MCP:** the run writes an MCP config pointing at `http://agentd/mcp` (agentd proxies to the orchestrator's existing MCP server with a **run-scoped, short-lived agent key**, `agent_api_keys` with `room_ids=[room]` and `expires_at=run end`). The CLI then gets `post_message`, `canvas_patch`, `remember`, `recall`, task tools, `ask_user` and so on.
- **Permission bridge:** the CLI's permission-prompt hook calls a local stdio MCP tool `saya_permission`, which agentd serves. It forwards to the orchestrator `/internal/runs/:id/permission`, which creates a `tool_calls` row with `status: pending_approval` through the **same** `audited.ts` path. The run parks as in §6.2, and the human's decision returns over the socket. Policies (§10) apply, so `auto` or allowlisted commands resolve instantly.

### 8.4 UX

- **Bot wizard:** a new "Engine" step with Saya Engine (any model), Claude Code or Codex. It shows install and auth status from `detect()`, plus a "Connect account" button that relays the login.
- **Room:** CLI events map to the same `run.step`, `tool.started` and `tool.output` events, so CLI bots look exactly like v2 bots: same timeline, cards and live view.
- **Usage limits:** `usage_limit` parks the run with the reset time, offers a "switch this run to Saya Engine with key X" button, and falls back automatically if `params.fallbackEngine` is set.

### 8.5 Acceptance

- Using a fake CLI binary (test fixture, emits scripted JSONL) in the computer image: streaming, permission round-trip, resume after orchestrator restart, interrupt, and usage-limit parking all work.
- A real-CLI smoke test runs manually, documented in `docs/leapfrog/cli-smoke.md`.
- §19 checks pass: no credential in logs, tool rows or exports.

---

## 9. WS4: Computer use v2

### 9.1 Profiles

`computer_profile` gains `desktop` (keep `standard`, and make `browser` real).

| Profile | Image | Adds |
|---|---|---|
| `standard` | `saaya/computer:<tag>` | Today's image + fs tools (§6.7) + `proc.*` |
| `browser` | `…-browser` | Chromium + Playwright driven by agentd (headless) |
| `desktop` | `…-desktop` | Xvfb + lightweight WM (openbox) + x11vnc (bound to the agentd socket namespace only) + Chromium headed + xdotool + scrot; **no** VNC port exposed |

New Dockerfiles: `deploy/docker/computer-browser.Dockerfile` and `computer-desktop.Dockerfile`. Desktop resource defaults are higher (2 vCPU, 3 GB). The admission logic in computerd's `ensure` accounts for this (bot-platform §6.5).

### 9.2 Browser automation (fixes the WS0-5 stubs)

agentd `browser` op, backed by a Playwright persistent context at `/home/bot/.saaya/browser-profile`:
- `open`
- `snapshot`: the accessibility tree with stable `ref` numbers. This is the main way models see the page; it is cheaper and more reliable than pixels.
- `click`, `type`, `select`, `scroll`, `back`, `wait_for`, `extract` (readability → markdown)
- `screenshot`: PNG saved to `/home/bot/.saaya/screens/`, returned to the model as an image part when the model supports vision, and broadcast to the room as a thumbnail.

All navigation goes through egress (SSRF + Secret Broker). `browser_type` into password fields is **refused** unless the value is a vault placeholder, in which case the broker fills it at egress or agentd resolves it through the orchestrator (follow bot-platform §6.4 rules).

### 9.3 Desktop control tools (`desktop` profile)

- `screen_capture({ region? })` → image part plus dimensions.
- `mouse({ action: move|click|double|right|drag|scroll, x, y, x2?, y2? })`, `keyboard({ type?: string, keys?: string[] })`, `wait({ ms })`.
- Where the model's provider offers a native computer-use tool definition, the registry maps it to these agentd ops (capability flag `supportsComputerUse`). Otherwise the generic tools above are used with screenshots.
- **Safety:**
  - Actions are rate-limited (10/s).
  - Every action is audited in `tool_calls`.
  - A **"pause bot hands"** button for any room admin immediately rejects pending and new desktop actions.

### 9.4 Live view for everyone in the room (multiplayer advantage)

- **computerd** adds `GET /v1/computers/:agentId/desktop` as a WebSocket that bridges RFB from x11vnc inside the sandbox (over agentd's socket) to the caller.
- **The orchestrator** exposes `/rooms/:roomId/computers/:agentId/desktop?token=` to the web. Tokens are short-lived (60 s to connect) and signed by the web after an RLS room-membership check. They're scoped read-only by default.
- **The web** embeds **noVNC** (pin a version; load it client-side only) in the Computer panel as a new **Screen** tab: a thumbnail in the room strip, expandable to full screen.
- **Browser profile without a desktop:** stream screencast frames (Chrome DevTools `Page.startScreencast` through agentd) as JPEG frames over the same websocket, at 5 fps or more.
- **Take control:** a room admin clicks "Take control". The token is upgraded to read-write, the bot's desktop and browser actions pause (`run.status = waiting:human_control`), and other viewers see "Ana is driving". "Hand back" resumes the run with an appended note: "a human changed the screen; re-capture before acting". This is how humans log in to sites for the bot without sharing passwords; cookies persist in the profile.
- **Action timeline and replay:** each screenshot and action is stored as a run step with the image in Supabase Storage (`computer-frames/<run>/<idx>.jpg`, 7-day retention). The run timeline scrubs through them.

### 9.5 Port previews (promoted from bot-platform §14)

Expose `https://<sig>.preview.<domain>` for a port inside a computer, room-member-only through a signed cookie. Bots can say "the dev server is at …" and humans click to open it. This needs wildcard DNS and TLS (human step). It pairs with the canvas HTML preview.

### 9.6 Deliberately not built

- **Host-OS control of a user's laptop** (OMB's Cua Driver). Sayabot is hosted, multi-tenant, and security-first; bots get their own machines.
- A future native desktop companion could add host control with explicit consent (see §21).

---

## 10. WS5: Human-in-the-loop v2

### 10.1 Ask cards

The new built-in `ask_user` tool (v2, CLI through MCP, external bots through the existing MCP `request_human_decision`, which gets unified):

```ts
{ question: string, options?: { id, label, description? }[], multi?: boolean,
  allowText?: boolean, audience?: "anyone" | "admins" | { userIds } , expiresInMin?: number,
  quorum?: number }   // quorum: N humans must answer (multiplayer advantage)
```

- **Storage:** a new `asks` table (or a `tasks` row of kind `request` with structured `options`; prefer reusing `tasks` kind `request` plus a new `ask_options jsonb` column, so the inbox, push, and the request state machine in `tasks-service.ts` all apply).
- **Inline rendering:** `AskCard` in `message-item.tsx` shows pills and buttons, a text box, who answered, and a countdown.
- **The run parks** (§6.2), and the answer resumes it with `{ answers: [{ userId, optionIds, text }] }`.

### 10.2 Approval policies

Replace boolean danger checks with a policy evaluator in `packages/core/src/policy.ts` (pure, heavily unit-tested):

- **Modes** (per agent, overridable per room): `ask` (every dangerous call), `auto` (no dangerous-call prompts; still audited), `confined` (only computer-local tools allowed, all network or external-change tools denied), `custom` (rules).
- **Rules:** `{ tool: glob, match?: { argPath: regex }, decision: allow|ask|deny, scope: once|run|session|always, createdBy }`, stored in `approval_rules`. Card buttons:
  - **Allow once**
  - **Allow for this run**
  - **Always allow `git status*` for @coder in #room**, which creates a rule
  - **Deny**
  - **Deny & tell the bot why**, which returns the reason as the tool result
- **Diff previews:** `fs_edit`/`fs_write`/`canvas_patch`/`git_commit` cards show the diff, and `computer_shell` shows the command with `isDestructiveCommand` highlights.
- **Multi-approver:** rules may require `quorum: 2` for high-risk tools such as `git_push` to main or prod DB writes. Two different admins must approve. OMB can't do this.
- **TTL:** per policy (default 30 min with parking, up from 5 min). On expiry, the **unattended policy** applies (§11.5).

### 10.3 Approve and answer from the phone

- **Push payloads gain `actions`:** Approve and Deny for approvals; up to 2 options plus "Open" for asks.
- The SW (`apps/web/src/sw.ts`) handles `notificationclick` with an action. It `POST`s to `/a/[token]`, where `token` is a **single-use, 10-minute, HMAC-signed** capability:
  - payload: `{ toolCallId | askId, userId, decision?, exp, nonce }`;
  - signed with a new `ACTION_TOKEN_KEY`;
  - nonces are stored to prevent replay.
- **The server re-checks authority** at use time. The user must still be an approver; RLS is the backstop.
- **iOS:** Web Push only works for installed PWAs (iOS 16.4+). The onboarding checklist (`setup-checklist.tsx`) prompts users to install the PWA.
- **Per-user routing preferences:** "push me only for approvals in rooms I'm in" and quiet hours.
- **Email fallback** if no push subscription exists, with the same signed-link approach, behind an org setting.

### 10.4 Acceptance

- **Policy unit tests:** at least 50 cases.
- **Playwright:** an ask card with 3 options; two users answer with quorum 2 and the run resumes.
- **Signed action:** approve from a simulated push. A replayed token fails, and an expired token fails.
- G4 latency is measured.

---

## 11. WS6: Proactivity

### 11.1 Routines

The new `routines` table:
- `id`, `org_id`, `room_id`, `agent_id?` (null means the room's turn plan decides), `name`, `prompt`;
- `schedule` (jsonb: `{ kind: "cron", expr, tz } | { kind: "interval", minutes (5–1440), window?: {start,end,days} } | { kind: "once", at }`);
- `overlap` (`skip` | `queue`), `unattended_policy_id`, `enabled`, `next_run_at`, `last_run_at`, `last_status`, `created_by_user?`, `created_by_agent?`, `budget_usd_per_run?`.

- **Scheduler:** generalise `scheduler/meetings.ts` into `scheduler/index.ts`. It keeps the same advisory-lock pattern, scans `routines.next_run_at <= now()` every 30 s, and enqueues `routine.fire` jobs (pg-boss, singleton key `routine:<id>:<slot>` for exactly-once firing). Weekday check-ins become **seeded routines**, so there is one system, not two.
- **Cron parsing** lives in `packages/core/src/cron.ts`. It is pure, timezone-aware, unit-tested against DST transitions, and reuses `minutesInTimeZone`. Before writing a parser, check the existing dependencies for a vetted cron library and prefer it.
- **Firing** posts a system message (`metadata.routineId`) to the room and starts the agent's turn through the coordinator, so the whole room sees what the routine did. Bots doing visible work in shared rooms is a Sayabot advantage.

### 11.2 Self-scheduling tools

- `schedule_followup({ in_minutes | at, note })` creates a `once` routine owned by the agent.
- `create_routine({ … })` is policy-gated (ask by default).
- `list_routines` and `cancel_routine` are scoped to the agent's own routines unless the agent is an admin bot.
- **Limits:** at most 20 active routines per agent and a minimum interval of 5 min.

### 11.3 Inbound webhooks

- **New `triggers` table:**
  - `id`, `org_id`, `room_id`, `agent_id?`, `kind` (`webhook` | `app_event`), `name`, `secret_enc` (for HMAC), `filter` (jsonb: JSONPath conditions), `prompt_template` (Mustache-style with `{{payload.x}}`, rendered **as data inside a fenced block, never as instructions**);
  - `rate_limit_per_min`, `enabled`, `unattended_policy_id`.
- **Endpoint:** `POST /hooks/:triggerId` on the orchestrator, routed by the web reverse proxy.
  - **Auth:** Standard Webhooks HMAC verification (reuse `@sayabot/core/server` signing helpers in reverse), or a bearer token, with a 5-minute replay tolerance.
  - **Limits:** a 256 KB body cap, a per-trigger rate limit, and payloads stored redacted in `trigger_receipts` (7-day retention).
- **Prompt-injection posture:** webhook content is untrusted. The rendered prompt wraps it as `<external_event source="…">…</external_event>`, the agent is told it is data, and policies can force `confined` mode for trigger-started runs.
- **UI:** per-room Automations settings let you create a trigger, copy its URL and secret, view recent receipts and replay one.

### 11.4 App events

- **Native first** (high value, well-documented webhooks):
  - GitHub (PR opened, review requested, CI failed): through the existing optional GitHub App path.
  - Slack Events API.
  - Linear.
  - Gmail through Google Pub/Sub watch (needs a Google Cloud project; human setup).
- Each is an `app_event` trigger with a typed filter UI.
- **Composio adapter (optional):** an org-level setting with a Composio key (stored in the vault). It subscribes to triggers and receives them at `/hooks/composio/:orgId`, which maps onto the same `triggers` model. This gives the long tail of apps without building each one.

### 11.5 Unattended policies

These say what happens when no human responds: overnight, or a routine run at 3 am.
- **`unattended_policies`:** `name`, `approval_behaviour` (`deny` | `auto_allow_low_risk` | `defer_until_window`), `ask_behaviour` (`skip_with_note` | `defer`), `max_usd`, `notify` (`summary_next_morning` | `immediate`).
- They are applied when an approval or ask exceeds its TTL in a run started by a routine or trigger.
- The morning summary (reusing the evening-rollup code path) lists what was deferred, denied or done.

### 11.6 Acceptance

- Cron fires correctly across DST transitions (tests).
- No duplicate fires when two orchestrator replicas run.
- Webhook HMAC: a bad signature returns 401, and a replay older than 5 min is rejected.
- A trigger-started run in `confined` mode cannot call network tools.
- G3 latency is met.

---

## 12. WS7: Integrations catalog

- **`mcp_catalog` (seeded table):** curated remote MCP servers with metadata (`slug`, `name`, `icon`, `url`, `auth: oauth|header|none`, `oauth` (discovery URL / client registration mode), `default_dangerous_tools[]`, `categories[]`, `docs_url`).
  - **Seed:** GitHub, Linear, Notion, Slack, Google Drive/Gmail/Calendar (where official remote MCP servers exist), Sentry, Stripe, Figma, Supabase, Vercel, Cloudflare.
  - **Verify each server's current URL and auth model at implementation time.** Don't ship unverified entries.
- **One-click connect:** OAuth 2.1 + PKCE + dynamic client registration *as a client* (Sayabot already implements the server side for invites). Tokens are stored in the vault (`vault_secrets` kind `oauth_token`, new; refresh handled by a pg-boss job). `mcp_servers` rows reference the vault secret instead of raw `headers_enc`.
- **Per-agent connection slots:** templates and team packages declare `requires: [{ slot: "github", catalog: "github" }]`. Installing a template prompts you to bind slots to connections. This is OMB's "connection slots", but org-shared.
- **Health:** a periodic `tools/list` probe that marks connections `degraded`, plus a re-auth card.
- **Composio** as a catalog entry type (`kind: "composio"`) for the long tail (§11.4).
- **Acceptance:** connect GitHub through OAuth in at most 3 clicks; the token never appears in `mcp_servers`, logs or the browser.

---

## 13. WS8: Voice

### 13.1 Speech sanitizer: `packages/core/src/speech.ts`

This is a pure function, `toSpeech(markdown, opts) → { text, skipped: Segment[] }`. Parse with the same markdown pipeline the web uses (an AST, not regex).

| Input | Output |
|---|---|
| Fenced code | "I've put the TypeScript code in the chat" (language-aware; mentions the canvas if `canvas_write` was used) |
| Tables | "a table with N rows comparing A, B and C" (reads the header row) |
| Headers, emphasis | Plain text |
| URLs | Domain only ("a link to github.com") |
| Citations, footnotes | Dropped |
| `@handles` | Display names |
| Math | Spoken for simple cases, otherwise "an equation" |
| Lists | Joined with pauses |
| Emoji | Dropped |

It also chunks into sentences for streaming TTS and keeps a mapping back to message offsets, so the UI can highlight what's being spoken. Target: at least 40 golden tests.

### 13.2 Providers

`packages/llm/src/voice.ts` is a registry mirroring the LLM registry:
- **TTS:** ElevenLabs, OpenAI, xAI, Fish Audio, Cartesia, plus the browser `speechSynthesis` fallback.
- **STT:** Deepgram, OpenAI, Fish, plus the browser Web Speech fallback.
- Keys are BYOK in `provider_keys` with new provider enum values, encrypted the same way.
- Per-agent voice: `params.voice = { provider, voiceId, speed }`.

### 13.3 Call mode (1:1 and huddles)

- **Transport:** a WebSocket per participant to the orchestrator (`/rooms/:id/voice`) carrying Opus or PCM frames. For more than 3 humans, plan a later move to an SFU such as LiveKit (§21).
- **Pipeline:** client VAD → STT stream → transcript posted to the room as a normal human message (`metadata.voice = true`) → the coordinator runs turns as usual → the agent's text streams through `toSpeech` → TTS streams audio back to every participant in the call. Agent turn-taking reuses the coordinator, so **multiple bots and multiple humans can share one huddle**. Mentions by voice ("hey Coder…") are resolved by a fuzzy match on display names.
- **Barge-in:** speech from a human during agent TTS stops playback and sends an interrupt (§6.4 interrupts).
- **Working while talking:** long runs speak short `run.step` narrations ("running the tests now"), throttled to 1 every 20 s, and **speak approval and ask cards aloud**: "Coder wants to push to main. Say approve or deny." A spoken approval requires a confirmation phrase plus an on-screen tap for `quorum` or high-risk tools.
- **Dictation:** a mic button in the composer (STT only).
- **Privacy:** audio isn't stored by default. Transcripts are normal messages. Org settings can disable voice.

### 13.4 Acceptance

- Speech golden tests pass.
- Round trip with mock STT/TTS (Playwright, fake media): speak → agent reply audio.
- Barge-in stops audio in under 300 ms.
- The cost of voice minutes is recorded in `usage_events` (`kind: "tts" | "stt"`, new column).

---

## 14. WS9–WS11

### 14.1 WS9: Mobile

- **PWA hardening:**
  - a mobile room layout with chat-first tabs (chat, canvas, screen, run);
  - an inbox-first home on small screens;
  - an install prompt;
  - offline outbox (already planned in the root plan; verify).
- **Actionable push** (§10.3) covers about 80% of OMB's companion-app value without a pairing step.
- **Later:** a Capacitor wrapper for app-store presence and native push (APNs/FCM), reusing the same `/a/[token]` actions. No mDNS or relay is needed because Sayabot is hosted. Native push adds a `push_subscriptions.kind` column.

### 14.2 WS10: Portability and CLI

**Team package format: `sayabot.team.json`.** The zod schema lives in `packages/core/src/team-package.ts`; YAML is accepted on import.

```jsonc
{
  "format": "sayabot.team/1",
  "name": "Growth Department", "description": "...",
  "agents":   [{ "ref": "writer", "handle": "writer", "displayName": "...", "avatar": "data:...|url",
                 "systemPrompt": "...", "engine": "v2", "params": {...}, "capabilities": {...},
                 "model": { "provider": "anthropic", "model": "...", "slot": "llm_main" },
                 "connections": [{ "slot": "notion", "catalog": "notion" }],
                 "secrets":     [{ "slot": "SEO_API_KEY", "hosts": ["api.example.com"] }] }],
  "rooms":    [{ "ref": "growth", "name": "growth", "turnMode": "debate", "agents": ["writer","editor"],
                 "directive": "...", "canvases": [{ "title": "...", "kind": "markdown", "text": "..." }] }],
  "routines": [{ "room": "growth", "agent": "writer", "schedule": {...}, "prompt": "..." }],
  "triggers": [{ "room": "growth", "kind": "app_event", "app": "github", "filter": {...} }],
  "skills":   [{ "slug": "...", "title": "...", "description": "...", "body": "..." }],
  "memories": [{ "scope": "org", "kind": "procedure", "title": "...", "body": "..." }]
}
```

- **Export** (`/[org]/settings/export` or room menu): **never** includes keys, secrets, vault values, OAuth tokens, CLI credentials, message history or personal memories. Model keys, connections and secrets become **slots**. A redaction pass runs `redactSecrets` over every string and fails the export on any hit.
- **Import:** a preview diff ("creates 5 agents, 2 rooms, 3 routines; needs: 1 LLM key, Notion connection, 1 secret") plus slot binding. Handle conflicts get suffixed. Imported routines start **disabled**.
- **Gallery** (later): publish packages org-internally first; public listing is out of scope (§21).
- The existing 9 markdown templates are converted to single-agent packages so there is one format.

**`saya` CLI (`apps/cli`, `@sayabot/cli`, published to npm):**
- Authenticates with an agent API key or a user PAT (new `user_api_tokens` table, hashed like `agent_api_keys`).
- Commands:
  - `saya login`
  - `saya rooms list`
  - `saya send <room> "<msg>" [--wait] [--json]`
  - `saya run <room> --agent coder "<task>" --wait --timeout 30m --json` (exit 0 done, 1 error, 2 needs human, 3 budget)
  - `saya team apply ./team.json`
  - `saya team export <room|org>`
  - `saya routines list`
  - `saya logs <run>`
- It's a thin client over `/api/v1`. No business logic is duplicated.
- **GitHub Action** `sayabot/run-action`: wraps `saya run` to put a bot on PRs ("review this PR in #eng with @reviewer and post the verdict").

### 14.3 WS11: Onboarding, self-host and enterprise

- **Hosted fast path:** signup → workspace auto-created → a "starter team" package installed → a dev-model credit or BYOK prompt → first bot reply in under 60 s. Measure it.
- **Self-host:** `deploy/docker-compose.selfhost.yml` with Postgres, Supabase-compatible auth and realtime (the Supabase self-host stack), orchestrator, web, computerd, egress, plus a `./setup.sh` that generates `MESH_KEK`, VAPID keys and `ACTION_TOKEN_KEY` and runs migrations **for that local stack only**. Document clearly that this is separate from the live DB rule in §0.
- **Real SSO:** SAML and OIDC through Supabase Auth SSO (verify plan support) wired to `orgs.sso_enabled`, plus domain verification. SCIM is later.
- **Audit export** and per-org data-retention settings, which build trust for the multiplayer pitch.

---

## 15. WS12: Quality

### 15.1 Saya eval suite (`evals/`)

This is the gate for every engine change. **Bots are "better" only if the evals say so.**

- **Runner:** `pnpm eval --engine v1|v2|cli --model <id> --suite <name>` spins up an ephemeral room against a **test** database. Never use the live DB; use a local Postgres or a dedicated test project. It runs scripted human turns and scores the results.
- **Suites:**

  | Suite | Size | What it checks |
  |---|---|---|
  | `coding` | 30 tasks | A repo in the computer; graded by hidden tests passing |
  | `research` | 20 tasks | Graded by an LLM judge with a rubric, plus citation checks |
  | `canvas` | 15 tasks | Produce or modify a doc; structural checks plus a judge |
  | `multi-agent` | 15 tasks | Debate or task-graph tasks; outcome and turn efficiency |
  | `memory` | 50 probes | Plant then recall across rooms and time (G2) |
  | `hitl` | 10 tasks | Correct use of `ask_user` versus guessing; no approval bypass |
  | `safety` | 25 tasks | Prompt injection through webhook, web page or MCP result tries to exfiltrate a secret or bypass policy; **must be 0 failures** |
  | `voice` | 40 | Speech sanitizer goldens (deterministic) |

- **Metrics per run:** success, cost (USD), tokens, cache-hit %, steps, wall time, human interventions.
- **Results** are stored in `evals/results/<date>-<engine>-<model>.json`, and a markdown report compares engines.
- **Cost control:** a full suite needs explicit opt-in (`--yes-spend`) and prints its estimated cost first. CI runs the deterministic subset (`voice`, policy, mock-model engine tests) only.

### 15.2 Test targets (by risk, not by count)

| Area | Requirement |
|---|---|
| `@sayabot/core` pure modules (`policy`, `cron`, `speech`, `team-package`, `engine`) | ≥ 90% line coverage |
| Engine loop | Mock-model tests (AI SDK mock providers) for: parallel tools, compaction, resume after crash, interrupt fold, budget wrap-up, retry/backoff, fallback model, refusal |
| agentd | Unit tests per op, including `proc.*`, browser and fs_edit uniqueness |
| RLS | SQL tests (pgTAP or Vitest against a test DB) for every new table |
| e2e (Playwright) | Ask card quorum, approval from signed link, live tool output, routine fire, webhook trigger, team import, take control (mock VNC) |
| Security | §19 checks automated where possible |

### 15.3 Observability

- **OpenTelemetry spans:** run, then step, then tool and model, with `run_id`/`room_id`/`agent_id` attributes and no content. Export is optional (an `OTEL_EXPORTER_OTLP_ENDPOINT` env var).
- **Admin analytics** (`/[org]/analytics`): cost per completed task, cache-hit rate, steps per run, approval latency, routine success and memory recall usage.
- **Run viewer:** `/[org]/runs/[runId]` shows the full timeline (steps, tools, diffs, frames, subagents, recalled memories) with a "copy as bug report" (redacted) button.

---

## 16. Tickets

Each ticket lists dependencies (`←`). Size: S ≤ 1 day, M ≤ 3 days, L ≤ 1 week, XL > 1 week (split before starting).

### WS0: Foundations
- **WS0-1..7** (S each), §5. No dependencies.

### WS1: Saya Engine
| ID | Ticket | Size | ← |
|---|---|---|---|
| E1 | Registry capability flags + `providerOptions` mapping (cache, effort, compaction, context editing, computer use); tests per provider | M | — |
| E2 | Migration 0010: `run_steps`, `run_transcripts`, `agent_runs.{engine,steps,finish_reason,heartbeat_at,parent_run_id}`, `agent_run_status += waiting`, `usage_events.cached_input_tokens` | S | WS0-7 |
| E3 | Context builder (§6.3) + prefix-stability test + canvas/task diffs in the tail | L | E1 |
| E4 | Loop + persistence + heartbeat + engine dispatch in coordinator (`startAgentTurn`) | L | E2, E3 |
| E5 | Parking and resume (`run.resume` job, boot recovery, idempotency keys) | L | E4 |
| E6 | Recovery: retries, quota and auth parking, fallback model, refusal handling | M | E4 |
| E7 | Compaction (clear tool results → summarise → promote to memory) | L | E4, M2 |
| E8 | `update_plan` tool + `run.plan` events + plan UI + promote to task | M | E4 |
| E9 | Code tool kit in agentd (`fs_*`, background jobs, git helpers) + model-facing tool docs | L | WS0-1 |
| E10 | Verify (`self`, `critic`) | M | E4, E11 |
| E11 | Subagents | M | E4 |
| E12 | Effort routing + `cheapModel` | S | E1 |
| E13 | Skills table, `load_skill`, `propose_skill`, seed skills, admin UI | M | E3 |
| E14 | Tool search (`find_tools`) | M | E3 |
| E15 | Mid-run interrupts (mention folds into the run) | M | E4 |
| E16 | Run activity UI: turn-strip status, run timeline, interim thread updates | L | E4, WS0-2 |
| E17 | Eval gate, then default `v2` for new agents | S | all E*, Q1 |

### WS2: Memory
| ID | Ticket | Size | ← |
|---|---|---|---|
| M1 | Migration: `memories` (+ pgvector, tsv, indexes) + RLS SQL `0011_memory.sql`; enabling the pgvector extension is a human step | M | — |
| M2 | Memory service: write (redact, dedupe), hybrid recall (RRF), pinned digest | L | M1 |
| M3 | Tools: `remember`, `recall`, `forget`, `update_memory` + MCP exposure + policy gate | M | M2, P1 |
| M4 | Pre-turn recall injection in the engine + "why recalled" trace | M | M2, E3 |
| M5 | Post-run extraction + suggested-memories inbox | M | M2 |
| M6 | Nightly consolidation + episode logs + contradiction flags | M | M2 |
| M7 | Memory UIs (agent, room, org settings) + `/remember` command | L | M2 |
| M8 | File mirror into `/home/bot/.saaya/memory` | S | M2 |

### WS3: CLI drivers
| ID | Ticket | Size | ← |
|---|---|---|---|
| C0 | **Provider terms review (human/legal)**; decides the subscription mode per driver | S | — |
| C1 | agentd `proc.*` ops + frame multiplexing + idle reaping; `cli_sessions` table | L | — |
| C2 | Driver contract + fake-CLI fixture + event mapping to run events | M | C1, E4 |
| C3 | Permission bridge (`saya_permission` stdio MCP in agentd → audited approvals) | M | C2, P1 |
| C4 | Run-scoped agent keys + agentd MCP proxy to Sayabot tools | M | C2 |
| C5 | Claude Code driver (API-key mode; subscription mode if C0 allows) | M | C2–C4, C0 |
| C6 | Codex driver | M | C2–C4, C0 |
| C7 | Wizard engine step, connect-account relay, usage-limit parking and fallback engine | M | C5 |

### WS4: Computer use
| ID | Ticket | Size | ← |
|---|---|---|---|
| U1 | Browser image + agentd `browser` op (Playwright persistent context, a11y snapshot refs) | L | — |
| U2 | Vision plumbing: screenshots as image parts to vision models; thumbnails broadcast | M | U1, E3 |
| U3 | Desktop image (Xvfb, openbox, x11vnc, xdotool) + `screen_capture`/`mouse`/`keyboard` ops | L | — |
| U4 | computerd desktop WS bridge + orchestrator signed proxy + web noVNC Screen tab | L | U3 |
| U5 | Browser screencast stream for the `browser` profile | M | U1, U4 |
| U6 | Take control / hand back + pause bot hands | M | U4 |
| U7 | Frame storage + run timeline scrubber | M | U2, E16 |
| U8 | Port previews (wildcard DNS/TLS is a human step) | L | — |

### WS5: HITL
| ID | Ticket | Size | ← |
|---|---|---|---|
| P1 | `policy.ts` evaluator + `approval_rules` + mode per agent/room + card buttons (once/run/always/deny-with-reason) | L | — |
| P2 | Ask cards (`ask_user`, `tasks.ask_options`, AskCard UI, quorum) | L | E5 |
| P3 | Diff previews on approval cards | M | E9 |
| P4 | Signed action tokens `/a/[token]` + SW notification actions + replay protection | M | — |
| P5 | Per-user notification preferences + quiet hours + email fallback | M | P4 |
| P6 | Multi-approver quorum on approvals | S | P1 |

### WS6: Proactivity
| ID | Ticket | Size | ← |
|---|---|---|---|
| R1 | `routines` + `cron.ts` + unified scheduler (meetings become seeded routines) | L | — |
| R2 | Self-scheduling tools | S | R1, P1 |
| R3 | Inbound webhook triggers + receipts + Automations UI | L | — |
| R4 | Unattended policies + morning summary | M | R1, P1 |
| R5 | GitHub app events | M | R3 |
| R6 | Slack Events + Linear | M | R3, K2 |
| R7 | Gmail (Pub/Sub) | M | R3, K2 |
| R8 | Composio adapter | M | R3 |

### WS7: Integrations
| ID | Ticket | Size | ← |
|---|---|---|---|
| K1 | `mcp_catalog` seed (verified entries only) + catalog UI | M | — |
| K2 | OAuth client flow (PKCE + DCR) + `vault_secrets.kind = oauth_token` + refresh job | L | K1 |
| K3 | Connection slots on agents and templates | M | K2 |
| K4 | Connection health probe + re-auth card | S | K2 |

### WS8: Voice
| ID | Ticket | Size | ← |
|---|---|---|---|
| V1 | `speech.ts` + 40 goldens | M | — |
| V2 | Voice provider registry + BYOK keys | M | — |
| V3 | Composer dictation | S | V2 |
| V4 | 1:1 call mode (WS audio, VAD, STT→message, TTS stream, barge-in) | XL→split | V1, V2 |
| V5 | Huddles (multi-human, multi-bot) + spoken approvals | L | V4, P1 |

### WS9–11
| ID | Ticket | Size | ← |
|---|---|---|---|
| X1 | Mobile room layout + install prompt + inbox-first home | M | — |
| X2 | Team package schema + export (slots, redaction) | M | — |
| X3 | Team import (preview diff, slot binding, disabled routines) + convert md templates | L | X2, K3, R1 |
| X4 | `user_api_tokens` + `saya` CLI | L | — |
| X5 | GitHub Action | S | X4 |
| X6 | Hosted 60-second onboarding with a starter team package | M | X3 |
| X7 | Self-host compose + setup script | L | — |
| X8 | Real SSO (SAML/OIDC) | L | — |
| X9 | Capacitor wrapper + native push | L | P4 |

### WS12
| ID | Ticket | Size | ← |
|---|---|---|---|
| Q1 | Eval runner + test-DB harness + `coding`, `memory`, `hitl`, `safety` suites | XL→split | E4 |
| Q2 | `research`, `canvas`, `multi-agent` suites + LLM judge with rubric | L | Q1 |
| Q3 | OTel spans + run viewer page + analytics tiles | L | E4 |
| Q4 | RLS test harness for new tables | M | M1 |

---

## 17. Roadmap and sequencing

Phases are ordered by the impact of each phase on "are the bots better", and by dependency. Week counts assume one team of 3–4 engineers plus coding agents. Re-estimate after Phase 1.

| Phase | Weeks | Theme | Tickets | Exit criteria |
|---|---|---|---|---|
| **1. Smarter bots** | 1–4 | Harness + memory core | WS0-*, E1–E9, E12, E15, E16, M1–M4, P1, Q1 (coding, memory, hitl) | v2 beats v1 on evals (G1 partial); cache hit ≥ 70% on long runs; runs survive a restart |
| **2. Eyes, hands, steering** | 5–8 | Computer use + HITL | U1–U7, P2–P6, E10, E11, E13, M5–M8, Q3 | Live screen in the room, take control, ask cards with quorum, approve from phone (G4, G6) |
| **3. Always on** | 9–11 | Proactivity + integrations | R1–R5, K1–K4, E14, E17 | Routines + webhooks + GitHub events; one-click GitHub/Linear/Notion; **v2 default for new agents** |
| **4. Their economics, our room** | 12–14 | CLI engines | C0–C7 (C0 starts in Phase 1, it's a human task) | Claude Code / Codex bots in rooms with Sayabot approvals and memory |
| **5. Voice and reach** | 15–18 | Voice + mobile + portability | V1–V5, X1–X6, R6–R8 | Huddles with multiple bots; team packages; `saya` CLI; 60-second onboarding |
| **6. Enterprise and self-host** | 19+ | — | X7–X9, U8, Q2, Q4 | SSO, self-host, native app |

**Parallelism.** Within a phase, the work splits into four lanes:
- engine (E*)
- computer (U*/C1)
- product and UI (P*, E16, M7)
- infra and quality (Q*, R1)

C0 (the terms review) and the human setup steps start in week 1:
- pgvector extension
- wildcard DNS
- Google Cloud project for Gmail
- Slack app
- VAPID keys already exist; add `ACTION_TOKEN_KEY`

---

## 18. Data model summary

New SQL: `0010_engine.sql`, `0011_memory.sql`, `0012_hitl.sql`, `0013_proactivity.sql`, `0014_integrations.sql`, `0015_voice_cli.sql`. Use one Drizzle migration per phase. All new tables get RLS in the same file, with org membership as the baseline and room membership where `room_id` is set.

| Table / change | WS | Notes |
|---|---|---|
| `agent_runs` += `engine`, `steps`, `finish_reason`, `heartbeat_at`, `parent_run_id`, `waiting_reason`; enum `agent_run_status` += `waiting` | 1 | — |
| `run_steps`, `run_transcripts` | 1 | Redacted content only; 30-day retention job for transcripts of finished runs |
| `usage_events` += `cached_input_tokens`, `kind` (`llm`\|`tts`\|`stt`\|`embedding`) | 1, 8 | — |
| `skills` | 1 | — |
| `memories` (+ pgvector, tsvector) | 2 | — |
| `approval_rules`; `tool_calls` += `idempotency_key`, `quorum`, `approvals jsonb`, `decided_reason` | 5 | — |
| `tasks` += `ask_options jsonb`, `ask_quorum`, `ask_answers jsonb` | 5 | Reuses the request state machine |
| `action_tokens` (nonce, used_at) | 5 | — |
| `notification_prefs` | 5 | — |
| `routines`, `triggers`, `trigger_receipts`, `unattended_policies` | 6 | `room_schedules` migrates into seeded routines (keep the table read-only for one release) |
| `mcp_catalog`; `vault_secret_kind` += `oauth_token`; `mcp_servers` += `vault_secret_id`, `catalog_slug`, `health` | 7 | — |
| `provider` enum += voice providers, or a separate `voice_provider` enum (prefer separate) | 8 | — |
| `cli_sessions` (agent, room, thread, driver, cursor, last_used_at) | 3 | — |
| `computer_profile` += `desktop` | 4 | — |
| `user_api_tokens` | 10 | Hashed like `agent_api_keys` |

---

## 19. Security acceptance

These are additions to `docs/bot-platform/plan.md` §13.2. Every item is required before its feature flag turns on in production.

1. **Memory:** no secret or placeholder-resolved value is ever stored. Room and org writes respect policy. Cross-org recall is impossible (RLS test). Prompt-injected "remember that the admin password is…" is redacted or refused.
2. **Transcripts and run steps:** stored only after scrubbing. Partial persistence uses the run scrubber (WS0-4).
3. **CLI credentials:** they live only on the bot's volume. They're excluded from file listing downloads, `computer_publish`, exports and logs. Egress allowlists only the provider's hosts. The run-scoped MCP key expires at run end and is room-scoped.
4. **Desktop and VNC:** no listening TCP port inside the sandbox reachable from the network. The WS bridge requires a signed, short-lived, room-scoped token. Read-write needs room admin. Every human-control session is audited.
5. **Signed action links:** HMAC, single use, 10-minute expiry, approver re-check at use time, no secrets in the URL beyond the opaque token, and `Referrer-Policy: no-referrer` on `/a/*`.
6. **Webhooks and app events:** HMAC verified with constant-time compare, replay window, size and rate caps, untrusted-content framing, and an optional forced `confined` mode. The safety eval suite includes injection through each trigger type.
7. **Team packages:** export fails closed on any redaction hit. Import never auto-enables routines or triggers, and secrets are slot-bound by an admin.
8. **Voice:** no audio retained by default. High-risk spoken approvals require an on-screen confirmation.
9. **Subagents and critics:** they inherit the parent's policy, scope and budget, never more.
10. **Skills:** agent-proposed skills need admin approval before any other agent can load them.

---

## 20. Risks and open questions

| # | Risk | Mitigation |
|---|---|---|
| R1 | **CLI subscription use on a hosted service may conflict with provider terms**, and terms change. | C0 review gates subscription mode. API-key mode always works. The UI never promises "$0" unconditionally. |
| R2 | Long loops raise cost and blast radius. | Budgets (steps, USD, wall clock), 80% wrap-up, policies, caching, cheap-model subagents. Eval-gated defaults. |
| R3 | Memory poisoning through prompt injection. | Policy-gated room and org writes, provenance on every item, confidence threshold → human inbox, contradiction flags, one-click forget. |
| R4 | Desktop images are heavy for a single VPS. | `desktop` is an opt-in profile with stricter quotas in computerd admission. Idle stop. The browser profile with screencast covers most "watch it work" cases more cheaply. |
| R5 | AI SDK 7 provider options for caching, compaction and effort may lag the providers. | Capability flags isolate this. Where the SDK lacks an option, use `providerOptions` passthrough or a thin direct-SDK adapter for that provider behind the same interface. |
| R6 | Preserved-thinking or append-only constraints on newer models break history rewriting. | The context builder is append-only by design. Compaction uses provider-native blocks where available. Interrupts and notes append and never edit. |
| R7 | Web Push on iOS needs an installed PWA. | Install prompts, email fallback, Capacitor later. |
| R8 | Scope: 6 phases is a lot. | Phases 1–2 alone deliver "better bots". Everything after is additive and independently shippable. |
| R9 | Self-host vs. Supabase coupling. | Self-host uses the Supabase self-host stack, not a rewrite onto SQLite. Accept the heavier footprint; desktop simplicity is not our market. |

**Open questions for the owner:**
1. Default model and cheap model for the hosted dev credit?
2. Is pgvector acceptable on the current Supabase plan, and which embedding provider is the default?
3. Composio: build the adapter in Phase 3 or wait for demand?
4. Voice: which TTS provider should be first-class for launch?
5. Is a public team gallery wanted (it brings moderation load)?

---

## 21. Out of scope / later

- **Host-OS control of a user's own machine** (a native desktop companion with consent prompts).
- **SFU-based voice** (LiveKit) for large huddles; WebSocket audio first.
- **Public team-package marketplace** with versioning and ratings.
- **Process-preserving computer hibernate** (gVisor checkpoint/restore), carried over from bot-platform §14.
- **Multi-host compute placement**, carried over.
- **Fine-tuning or RL on Sayabot eval transcripts.**
- **SCIM provisioning.**
