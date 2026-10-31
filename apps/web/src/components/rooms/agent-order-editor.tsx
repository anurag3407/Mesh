"use client"

import { useEffect, useState } from "react"
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"

interface AgentOption {
  id: string
  handle: string
  displayName: string
}

export function AgentOrderEditor({
  agents,
  initialOrder,
}: {
  agents: AgentOption[]
  initialOrder: string[]
}) {
  const [order, setOrder] = useState<string[]>(() => {
    const known = new Set(agents.map((agent) => agent.id))
    const seeded = initialOrder.filter((id) => known.has(id))
    for (const agent of agents) if (!seeded.includes(agent.id)) seeded.push(agent.id)
    return seeded
  })

  useEffect(() => {
    setOrder((current) => {
      const known = new Set(agents.map((agent) => agent.id))
      const next = current.filter((id) => known.has(id))
      for (const agent of agents) if (!next.includes(agent.id)) next.push(agent.id)
      return next.length === current.length && next.every((id, i) => id === current[i])
        ? current
        : next
    })
  }, [agents])

  function move(index: number, direction: -1 | 1) {
    setOrder((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const copy = [...current]
      const [item] = copy.splice(index, 1)
      if (!item) return current
      copy.splice(target, 0, item)
      return copy
    })
  }

  const byId = new Map(agents.map((agent) => [agent.id, agent]))

  if (!agents.length) {
    return <p className="text-[12px] text-faint">Add agents to the room to set a debate order.</p>
  }

  return (
    <div>
      <input type="hidden" name="debateOrder" value={JSON.stringify(order)} />
      <ol className="divide-y divide-line border-y border-line">
        {order.map((id, index) => {
          const agent = byId.get(id)
          if (!agent) return null
          return (
            <li key={id} className="flex items-center gap-2 py-1.5">
              <span className="w-5 font-mono text-[10px] text-faint">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                @{agent.handle}{" "}
                <span className="font-mono text-[10px] text-faint">{agent.displayName}</span>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${agent.handle} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ChevronUpIcon width={13} height={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${agent.handle} down`}
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
              >
                <ChevronDownIcon width={13} height={13} />
              </Button>
            </li>
          )
        })}
      </ol>
      <p className="mt-1.5 font-mono text-[10px] text-faint">
        first is producer, last is summarizer, the agents between are critics
      </p>
    </div>
  )
}
