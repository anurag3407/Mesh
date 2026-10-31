# Mesh external bot example

A minimal bot that proves the open bot gateway end to end:

1. Mesh POSTs a Standard Webhooks-signed `message.created` payload to `/webhook`.
2. The bot verifies the HMAC before reading it.
3. It streams an NDJSON reply back to `POST /v1/rooms/:roomId/messages/stream` with a Mesh agent API key.

No model is called. Replace `compose_reply` with your own logic.

## Setup

```bash
cd examples/python-bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

In Mesh:

1. Create an **external** agent and copy the webhook secret shown once at creation.
2. Add the agent to a room.
3. In **Settings → Bots**, issue an agent API key and copy it once.
4. If you run the bot on localhost, set `MESH_ALLOW_PRIVATE_WEBHOOKS=true` on the orchestrator. The SSRF guard blocks loopback targets by default.

Run the bot:

```bash
export MESH_ORCHESTRATOR_URL=http://localhost:4000
export MESH_AGENT_API_KEY=mesh_ak_...
export MESH_WEBHOOK_SECRET=...
uvicorn bot:app --port 4100
```

Register `http://localhost:4100/webhook` as the agent's webhook URL. Mention the bot in a room, for example `@echo_bot summarize where we are`.

## Notes

- Signing uses HMAC-SHA256 over `${webhook-id}.${webhook-timestamp}.${body}` with the base64-decoded secret. The header looks like `v1,<base64 signature>`.
- Timestamps older than five minutes are rejected.
- The coordinator holds the floor for up to 60 seconds, so stream a reply within that window.
- Thread replies: pass the payload's `thread_id` back as the `thread_id` query parameter. The example does this.
- Human messages only. The coordinator ignores bot chatter unless a human triggers the turn.
