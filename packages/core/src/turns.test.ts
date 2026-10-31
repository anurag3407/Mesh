import { describe, expect, it } from "vitest"
import {
  debateRoleInstruction,
  orderDebateAgents,
  planBotFollowUps,
  planDebateTurns,
  planMentionsTurn,
  planModeratedMentions,
  validateModeratorChoice,
} from "./turns"
import type { AgentRef } from "./types"

const agents: AgentRef[] = [
  { id: "a", handle: "alice", kind: "llm" },
  { id: "b", handle: "bob", kind: "llm" },
  { id: "c", handle: "carol", kind: "llm" },
]

describe("planMentionsTurn", () => {
  it("queues every tagged agent in mention order and leaves the cap to the breaker", () => {
    expect(
      planMentionsTurn({
        text: "@carol @alice @bob",
        roomAgents: agents,
      }).map((t) => t.agentId),
    ).toEqual(["c", "a", "b"])
  })

  it("expands @all_bots and returns an empty queue with no mentions", () => {
    expect(
      planMentionsTurn({ text: "@all_bots", roomAgents: agents }).map((t) => t.agentId),
    ).toEqual(["a", "b", "c"])
    expect(planMentionsTurn({ text: "no bots here", roomAgents: agents })).toEqual([])
  })
})

describe("planBotFollowUps", () => {
  it("appends mentioned peers but never the sender", () => {
    expect(
      planBotFollowUps({
        text: "@bob can you check this? @alice",
        roomAgents: agents,
        senderAgentId: "a",
      }).map((t) => t.agentId),
    ).toEqual(["b"])
  })

  it("returns nothing when no peer is mentioned", () => {
    expect(
      planBotFollowUps({ text: "no peer here", roomAgents: agents, senderAgentId: "a" }),
    ).toEqual([])
  })
})

describe("planDebateTurns", () => {
  it("assigns producer, critics and summarizer following debate order", () => {
    const plan = planDebateTurns({
      roomAgents: agents,
      debateOrder: ["c", "a", "b"],
      text: "opening question",
    })
    expect(plan).toEqual([
      { agentId: "c", role: "producer" },
      { agentId: "a", role: "critic" },
      { agentId: "b", role: "summarizer" },
    ])
  })

  it("narrows participants to explicit mentions", () => {
    const plan = planDebateTurns({
      roomAgents: agents,
      debateOrder: null,
      text: "@bob @carol",
    })
    expect(plan).toEqual([
      { agentId: "b", role: "producer" },
      { agentId: "c", role: "summarizer" },
    ])
  })

  it("uses a single producer role for a one-agent debate", () => {
    expect(
      planDebateTurns({ roomAgents: agents, debateOrder: null, text: "@alice" }),
    ).toEqual([{ agentId: "a", role: "producer" }])
  })
})

describe("orderDebateAgents", () => {
  it("puts unknown order ids last and preserves room order for the rest", () => {
    expect(orderDebateAgents(agents, ["c", "missing"]).map((a) => a.id)).toEqual(["c", "a", "b"])
  })
})

describe("moderated mode", () => {
  it("honours explicit mentions", () => {
    expect(
      planModeratedMentions({ text: "@bob", roomAgents: agents }),
    ).toEqual([{ agentId: "b", role: "responder" }])
  })

  it("validates moderator choices and falls back to the human", () => {
    expect(validateModeratorChoice("a", agents)).toEqual({ next: "a", valid: true })
    expect(validateModeratorChoice("human", agents)).toEqual({ next: "human", valid: true })
    expect(validateModeratorChoice("ghost", agents)).toEqual({ next: "human", valid: false })
  })

  it("provides debate instructions only for debate roles", () => {
    expect(debateRoleInstruction("producer")).toContain("producer")
    expect(debateRoleInstruction("critic")).toContain("critic")
    expect(debateRoleInstruction("summarizer")).toContain("summarizer")
    expect(debateRoleInstruction("responder")).toBeNull()
  })
})
