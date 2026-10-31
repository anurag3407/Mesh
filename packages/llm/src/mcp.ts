import { createMCPClient } from "@ai-sdk/mcp"
import type { ToolSet } from "ai"

export interface McpServerConfig {
  id: string
  name: string
  transport: "http" | "sse"
  url: string
  headers?: Record<string, string>
  dangerousTools: string[]
}

export interface McpToolMeta {
  serverId: string
  serverName: string
  originalName: string
  dangerous: boolean
}

export interface McpToolsResult {
  tools: ToolSet
  meta: Record<string, McpToolMeta>
  errors: { serverName: string; message: string }[]
  call: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<unknown>
  close: () => Promise<void>
}

export function mcpToolName(serverName: string, toolName: string): string {
  const slug = serverName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return `${slug || "mcp"}__${toolName}`.slice(0, 64)
}

/** Connects every enabled MCP server, skipping ones that fail to come up. */
export async function connectMcpServers(servers: McpServerConfig[]): Promise<McpToolsResult> {
  const tools: ToolSet = {}
  const meta: Record<string, McpToolMeta> = {}
  const errors: McpToolsResult["errors"] = []
  const clients = new Map<string, Awaited<ReturnType<typeof createMCPClient>>>()
  const clientsInOrder: Awaited<ReturnType<typeof createMCPClient>>[] = []

  for (const server of servers) {
    try {
      const client = await createMCPClient({
        transport: {
          type: server.transport,
          url: server.url,
          headers: server.headers,
          redirect: "error",
        },
      })
      clientsInOrder.push(client)
      clients.set(server.id, client)
      const serverTools = await client.tools()
      for (const [originalName, definition] of Object.entries(serverTools)) {
        const name = mcpToolName(server.name, originalName)
        if (tools[name]) continue
        tools[name] = definition
        meta[name] = {
          serverId: server.id,
          serverName: server.name,
          originalName,
          dangerous: server.dangerousTools.includes(originalName),
        }
      }
    } catch (error) {
      errors.push({
        serverName: server.name,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const close = async () => {
    await Promise.allSettled(clientsInOrder.map((client) => client.close()))
  }

  return {
    tools,
    meta,
    errors,
    close,
    call: async (serverId, toolName, args) => {
      const client = clients.get(serverId)
      if (!client) throw new Error(`MCP server ${serverId} is not connected`)
      const result = (await client.callTool({ name: toolName, arguments: args })) as {
        content?: Array<{
          type: string
          text?: string
          resource?: { uri: string; text?: string }
        }>
        isError?: boolean
      }
      const content = (result.content ?? [])
        .map((part) => {
          if (part.type === "text") return part.text ?? ""
          if (part.type === "resource") {
            const resource = part.resource
            return resource && typeof resource.text === "string"
              ? resource.text
              : `[resource ${resource?.uri ?? "unknown"}]`
          }
          return `[${part.type}]`
        })
        .join("\n")
      if (result.isError) throw new Error(content || "MCP tool call failed")
      return content
    },
  }
}
