import { agents, mcpServers } from "@mesh/db"
import { connectMcpServers, openSecret } from "@mesh/llm"
import type { ToolSet } from "ai"
import { and, eq, isNull, or } from "drizzle-orm"
import { z } from "zod"
import { canvasPatchTool, canvasWriteTool } from "../canvas/tools"
import { getDb } from "../db"
import { getEnv } from "../env"
import { toAuditedTools, type ToolRuntime, type ToolSpec } from "./audited"
import { githubTool } from "./builtins/github"
import { postgresInspectorTool } from "./builtins/postgres"
import { sandboxTool } from "./builtins/sandbox"
import { webSearchTool } from "./builtins/web-search"

export interface BuildToolsArgs {
  roomId: string
  orgId: string
  agent: typeof agents.$inferSelect
  runtime: ToolRuntime
}

export interface BuiltTools {
  tools: ToolSet
  warnings: string[]
  close: () => Promise<void>
}

async function loadMcpConfigs(args: BuildToolsArgs) {
  const rows = await getDb()
    .select()
    .from(mcpServers)
    .where(
      and(
        eq(mcpServers.orgId, args.orgId),
        eq(mcpServers.enabled, true),
        or(isNull(mcpServers.roomId), eq(mcpServers.roomId, args.roomId)),
      ),
    )
  const allowList = args.agent.toolIds
  const filtered = allowList.length ? rows.filter((row) => allowList.includes(row.id)) : rows
  const warnings: string[] = []
  const configs = filtered.map((row) => {
    let headers: Record<string, string> | undefined
    if (row.headersEnc) {
      try {
        const parsed = JSON.parse(openSecret(row.headersEnc, getEnv().MESH_KEK)) as {
          headers?: Record<string, string>
        }
        headers = parsed.headers
      } catch {
        warnings.push(`MCP server "${row.name}" has unreadable headers; connecting without them`)
      }
    }
    return {
      id: row.id,
      name: row.name,
      transport: row.transport,
      url: row.url,
      headers,
      dangerousTools: row.dangerousTools,
    }
  })
  return { configs, warnings }
}

/**
 * Built-in tools plus every enabled MCP server for the room/org. MCP servers
 * that fail to connect are skipped and reported instead of failing the run.
 */
export async function buildTools(args: BuildToolsArgs): Promise<BuiltTools> {
  const warnings: string[] = []
  const { configs, warnings: configWarnings } = await loadMcpConfigs(args)
  warnings.push(...configWarnings)

  const specs: ToolSpec[] = [
    canvasWriteTool({ roomId: args.roomId, agentId: args.agent.id }),
    canvasPatchTool({ roomId: args.roomId, agentId: args.agent.id }),
    sandboxTool(),
    webSearchTool(),
    githubTool(args.orgId),
    postgresInspectorTool(args.orgId),
  ]
  const tools = toAuditedTools(specs, args.runtime)

  const mcp = await connectMcpServers(configs)
  warnings.push(...mcp.errors.map((e) => `MCP server "${e.serverName}" unavailable: ${e.message}`))

  const extraSpecs: ToolSpec[] = []
  for (const [name, definition] of Object.entries(mcp.tools)) {
    if (tools[name]) {
      warnings.push(`Skipped MCP tool ${name}: a built-in tool already uses that name`)
      continue
    }
    const meta = mcp.meta[name]
    if (!meta) continue
    extraSpecs.push({
      name,
      description:
        ((definition as { description?: string }).description ?? "") ||
        `MCP tool ${meta.originalName} from ${meta.serverName}`,
      schema: (definition as { inputSchema?: z.ZodType }).inputSchema ?? z.record(z.string(), z.unknown()),
      dangerous: meta.dangerous,
      execute: async (input: Record<string, unknown>, signal?: AbortSignal) => {
        if (signal?.aborted) throw new Error("run aborted")
        return mcp.call(meta.serverId, meta.originalName, input)
      },
    })
  }
  if (extraSpecs.length) {
    const extra = toAuditedTools(extraSpecs, args.runtime)
    for (const [name, definition] of Object.entries(extra)) tools[name] = definition
  }

  return {
    tools,
    warnings,
    close: mcp.close,
  }
}
