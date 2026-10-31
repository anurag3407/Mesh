# Mesh

A real-time collaboration workspace where human teams and AI agents share rooms, take
deterministic turns, edit a live canvas and call tools under human approval. Chats,
weekday meetings, check-ins, tasks, requests, files and a shared Inbox all sit on the
same room model.

## What is in the repo

```
apps/web             Next.js 16 App Router UI, auth, server actions, bot API proxy
apps/orchestrator    Hono HTTP API, pg-boss workers, turn coordinator, LLM runner,
                     Hocuspocus canvas sync, tool approvals, webhook delivery
packages/core        Pure logic: mentions, turn planning, breakers, repetition,
                     redaction, canvas patches, webhook signing, agent keys
packages/db          Drizzle schema, migrations, RLS/realtime SQL, seed
packages/llm         AES-256-GCM secret box, provider registry, MCP client factory
examples/python-bot  Reference external bot with signature verification and NDJSON streaming
e2e                  Playwright specs (separate test Supabase project recommended)
docs                 Deployment and operations notes
```

## Requirements

- Node 24
- pnpm 10.33
- A hosted Supabase project (Postgres, Auth, Realtime)
- An OpenAI-compatible model endpoint, or provider keys for the agents
- Optional: E2B for the code sandbox, Brave for web search, GitHub token for the GitHub bridge

## Quick start

```bash
cp .env.example .env
# fill Supabase URL, anon key, service role key and the session-pooler DATABASE_URL
openssl rand -base64 32   # MESH_KEK
openssl rand -hex 32      # ORCHESTRATOR_INTERNAL_SECRET
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The web app runs at http://localhost:3000 and the orchestrator at http://localhost:4000
with canvas sync at ws://localhost:4000/collab.

On first sign-in, the seven-step setup creates your workspace and first room, a weekday
meeting cadence, optional check-ins and room instructions. Then add a provider key, create
an agent, add the agent to a room, and mention it with `@handle`.

## Product surfaces

- **Chats** — rooms with people and agents, direct chats with a single bot, pin, mute,
  archive, unread and mention filters, plus a read-only view of agent-to-agent handoffs.
- **Meetings** — two weekday meetings per room, optional check-ins, start-now and
  scheduled meetings, wake/end controls and the last seven days of history.
- **Tasks** — a task board plus requests an agent raises when it needs a human decision.
  Tasks can be assigned to people or agents and carry comments.
- **Files** — every room canvas (markdown, code, SVG, HTML) with search, filters and a
  direct link to the canvas inside its room.
- **Inbox** — pending tool approvals and open requests in one place, with resolved items
  from the last week.

## Supabase setup

1. Create a project, then put the project URL, anon key, service role key and the
   **session pooler** connection string in `.env`. The transaction pooler does not support
   LISTEN/NOTIFY, which pg-boss and approvals use.
2. Run `pnpm db:migrate`. The migration creates 26 tables, RLS policies, safe views, the
   auth profile trigger, the realtime publication entries and private-channel policies.
3. Run `pnpm db:seed` to add starter model prices. Edit them under Settings, Pricing.
4. In Supabase Auth, set the Site URL to your app URL and add
   `<app>/auth/callback` to the redirect allow list.
5. Email and password sign-up is on by default. The sign-up flow also asks for a
   six-digit code: edit the Supabase **Confirm signup** email template so it includes
   `{{ .Token }}` (the token, not only `{{ .ConfirmationURL }}`). SMTP must be configured
   for the code email to arrive.
6. Google login is optional: enable the provider in Supabase and set
   `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. GitHub login is optional in the same way with
   `NEXT_PUBLIC_GITHUB_AUTH_ENABLED=true`.
7. SAML SSO is a Supabase Pro feature. Configure it there, then set
   `NEXT_PUBLIC_SSO_ENABLED=true` to expose the org flag.

The onboarding flow expects `{{ .Token }}` in the confirmation email. Without it users
will receive a link they did not ask for and the six-digit screen cannot complete.

## Commands

```bash
pnpm dev             # web + orchestrator
pnpm build           # web production build (webpack, because of Serwist)
pnpm typecheck
pnpm lint
pnpm test            # 75 unit tests
pnpm db:generate     # regenerate Drizzle SQL after schema changes
pnpm db:migrate      # apply Drizzle migrations + custom SQL (idempotent)
pnpm db:seed
pnpm e2e             # Playwright, needs E2E_* env and two test accounts
```

## Security model

- Provider keys, webhook secrets, MCP headers and tool connection strings are encrypted
  with AES-256-GCM using `MESH_KEK`. The ciphertext is never selectable by the
  `authenticated` role; only safe views are exposed.
- Agent API keys are shown once, stored as SHA-256 hashes with a short lookup prefix.
- Every model, bot and tool output is redacted for common secret formats before
  persistence or broadcast.
- Danger tools wait on a Postgres LISTEN channel for a room admin's decision. The timeout
  is five minutes and counts as a rejection.
- Webhooks use Standard Webhooks HMAC signatures with a five-minute timestamp tolerance
  and an SSRF guard that blocks loopback and private ranges unless
  `MESH_ALLOW_PRIVATE_WEBHOOKS=true`.
- Turn execution is serialized per room with a Postgres advisory lock. A newer human
  message supersedes the active session and aborts in-flight runs through LISTEN/NOTIFY.

## Deployment

See [docs/deployment.md](docs/deployment.md).

## Choices that differ from the plan

- **Canvas editing uses Y.Text for every kind.** Markdown is a Monaco source editor with a live
  Streamdown preview; HTML and SVG are source plus a sandboxed iframe; code is Monaco. The plan
  listed TipTap for markdown, but Y.Text lets `canvas_patch` apply search/replace splices without
  overwriting concurrent human edits, which is the property the canvas exists to provide.
- **UI primitives and icons are written in the repo** instead of pulled from shadcn/ui and an icon
  package. They use the same accessible patterns, but the type, stroke and interaction details
  belong to this product.
- **Webhook secrets are shown once** at agent creation or rotation and stored sealed. There is no
  read-back path because the UI never receives the plaintext after that moment.
- **Agent model testing runs in the orchestrator**, so BYOK plaintext is only decrypted there and
  in the provider-key test action.

## Known limits

- The meeting scheduler runs in the orchestrator process and uses a Postgres advisory
  lock, so run one orchestrator instance or accept a single active scanner.
- Browser notifications need the tab open and permission granted from the room header.
  They are a local convenience, not a push service.
- Hocuspocus runs in one orchestrator process. Horizontal canvas scaling needs the
  Hocuspocus Redis extension, which is not wired here.
- The UI is dark-only by design for long editing sessions.
- Monaco loads from its CDN. The PWA caches the shell, the offline page and the outbox. The local
  Monaco chunk is above Serwist's precache size limit, so a canvas opened fully offline falls back
  to the shell.
- `MESH_KEK` must stay stable. Changing it makes existing encrypted secrets unreadable.
