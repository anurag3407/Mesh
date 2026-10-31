"""Reference Mesh external bot.

Receives a signed webhook, verifies the signature, then streams a reply back into
the room using a Mesh agent API key.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import os
import time

import httpx
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request

ORCHESTRATOR_URL = os.environ.get("MESH_ORCHESTRATOR_URL", "http://localhost:4000").rstrip("/")
AGENT_API_KEY = os.environ["MESH_AGENT_API_KEY"]
WEBHOOK_SECRET = os.environ["MESH_WEBHOOK_SECRET"]
TOLERANCE_SECONDS = 300

app = FastAPI(title="Mesh example bot")


def _secret_bytes() -> bytes:
    secret = WEBHOOK_SECRET.strip()
    if secret.startswith("whsec_"):
        secret = secret[len("whsec_") :]
    return base64.b64decode(secret)


def verify_signature(headers, body: bytes) -> bool:
    webhook_id = headers.get("webhook-id")
    timestamp = headers.get("webhook-timestamp")
    signature = headers.get("webhook-signature")
    if not webhook_id or not timestamp or not signature:
        return False
    try:
        sent = int(timestamp)
    except ValueError:
        return False
    if abs(int(time.time()) - sent) > TOLERANCE_SECONDS:
        return False
    expected = hmac.new(
        _secret_bytes(),
        f"{webhook_id}.{timestamp}.".encode("utf-8") + body,
        hashlib.sha256,
    ).digest()
    for part in signature.split(" "):
        if not part.startswith("v1,"):
            continue
        try:
            candidate = base64.b64decode(part[3:])
        except ValueError:
            continue
        if hmac.compare_digest(candidate, expected):
            return True
    return False


def compose_reply(payload: dict) -> str:
    sender = payload.get("sender", {}).get("name", "there")
    content = payload.get("content", "")
    snapshot = payload.get("context_snapshot", [])[-3:]
    context_lines = "\n".join(f"- {item.get('sender')}: {item.get('content')[:140]}" for item in snapshot)
    return (
        f"{sender}, I received your message: \"{content[:240]}\".\n\n"
        f"Here is the recent context I was given:\n{context_lines or '- (no earlier messages)'}\n\n"
        "This is the reference bot. Replace compose_reply with your own model call or "
        "business logic. I will stay quiet unless a human mentions me again."
    )


async def stream_reply(payload: dict) -> None:
    room_id = payload.get("room_id")
    if not room_id:
        return
    thread_id = payload.get("thread_id")
    reply = compose_reply(payload)
    words = reply.split(" ")
    chunks = []
    for index, word in enumerate(words):
        delta = word if index == 0 else f" {word}"
        chunks.append(json.dumps({"delta": delta}) + "\n")
    chunks.append(json.dumps({"done": True}) + "\n")

    params = {"thread_id": thread_id} if thread_id else None
    url = f"{ORCHESTRATOR_URL}/v1/rooms/{room_id}/messages/stream"
    headers = {
        "authorization": f"Bearer {AGENT_API_KEY}",
        "content-type": "application/x-ndjson",
    }
    async with httpx.AsyncClient(timeout=120) as client:
        async def body():
            for chunk in chunks:
                yield chunk.encode("utf-8")
                await asyncio.sleep(0.03)

        response = await client.post(url, params=params, headers=headers, content=body())
        print(f"[bot] room={room_id} status={response.status_code} body={response.text[:300]}")


@app.post("/webhook")
async def webhook(request: Request, background: BackgroundTasks):
    body = await request.body()
    if not verify_signature(request.headers, body):
        raise HTTPException(status_code=401, detail="invalid signature")
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=400, detail="invalid JSON") from error
    if payload.get("event") != "message.created":
        return {"ok": True, "ignored": True}
    if payload.get("sender", {}).get("type") == "system":
        return {"ok": True, "ignored": True}
    background.add_task(stream_reply, payload)
    return {"ok": True}


@app.get("/health")
async def health():
    return {"ok": True}
