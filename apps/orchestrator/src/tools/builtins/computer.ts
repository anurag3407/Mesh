import { isDestructiveCommand } from "@mesh/core"
import { canvases, canvasVersions } from "@mesh/db"
import { z } from "zod"
import { getComputerClient } from "../../computer/client"
import { getDb } from "../../db"
import { broadcast } from "../../realtime"
import type { ToolSpec } from "../audited"

export interface ComputerToolsArgs {
  agentId: string
  orgId: string
  roomId: string
  profile: "standard" | "browser"
}

export function computerTools(args: ComputerToolsArgs): ToolSpec[] {
  const client = getComputerClient()
  const { agentId, orgId, roomId, profile } = args

  const shellTool: ToolSpec = {
    name: "computer_shell",
    description:
      "Execute a command in your persistent container shell. Working directory defaults to /home/bot. Output is streamed in real-time.",
    schema: z.object({
      command: z.string().min(1).max(20_000),
      cwd: z.string().optional(),
      timeoutSeconds: z.number().int().min(1).max(300).default(60),
    }),
    dangerous: (input) => isDestructiveCommand((input as { command: string }).command),
    execute: async (input: { command: string; cwd?: string; timeoutSeconds?: number }, signal) => {
      await client.ensure(agentId, orgId, profile)
      let seq = 0

      const result = await client.exec(
        agentId,
        {
          cmd: input.command,
          cwd: input.cwd,
          timeoutMs: (input.timeoutSeconds || 60) * 1000,
          onChunk: (chunk) => {
            void broadcast(roomId, {
              type: "tool.output",
              toolCallId: agentId,
              seq: seq++,
              chunk,
            })
          },
        },
        signal,
      )

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exit_code: result.exitCode,
        duration_ms: result.durationMs,
        truncated: result.truncated,
      }
    },
  }

  const readFileTool: ToolSpec = {
    name: "computer_read_file",
    description: "Read a file from your persistent container environment.",
    schema: z.object({
      path: z.string().min(1),
      maxBytes: z.number().int().positive().max(2_000_000).default(500_000),
    }),
    dangerous: false,
    execute: async (input: { path: string; maxBytes?: number }) => {
      await client.ensure(agentId, orgId, profile)
      return client.readFile(agentId, { path: input.path, maxBytes: input.maxBytes })
    },
  }

  const writeFileTool: ToolSpec = {
    name: "computer_write_file",
    description: "Write content to a file in your persistent container (/home/bot or /tmp).",
    schema: z.object({
      path: z.string().min(1),
      content: z.string().max(1_000_000),
    }),
    dangerous: false,
    execute: async (input: { path: string; content: string }) => {
      await client.ensure(agentId, orgId, profile)
      return client.writeFile(agentId, { path: input.path, content: input.content })
    },
  }

  const listFilesTool: ToolSpec = {
    name: "computer_list",
    description: "List directory contents in your persistent container filesystem.",
    schema: z.object({
      path: z.string().optional().default("/home/bot"),
      depth: z.number().int().min(1).max(3).default(1),
    }),
    dangerous: false,
    execute: async (input: { path?: string; depth?: number }) => {
      await client.ensure(agentId, orgId, profile)
      return client.listFiles(agentId, { path: input.path, depth: input.depth })
    },
  }

  const publishTool: ToolSpec = {
    name: "computer_publish",
    description: "Publish a file from your computer to the room as a shared Canvas document.",
    schema: z.object({
      path: z.string().min(1),
      as: z.enum(["canvas", "file"]).default("canvas"),
      title: z.string().optional(),
    }),
    dangerous: false,
    execute: async (input: { path: string; as: "canvas" | "file"; title?: string }) => {
      await client.ensure(agentId, orgId, profile)
      const file = await client.readFile(agentId, { path: input.path })

      const inferredKind = input.path.endsWith(".md")
        ? "markdown"
        : input.path.endsWith(".svg")
          ? "svg"
          : input.path.endsWith(".html")
            ? "html"
            : "code"

      const defaultTitle = input.path.split("/").pop() || "Published File"

      const [row] = await getDb()
        .insert(canvases)
        .values({
          roomId,
          title: input.title || defaultTitle,
          kind: inferredKind,
          snapshotText: file.content,
          language: inferredKind === "code" ? "text" : undefined,
        })
        .returning()

      if (row) {
        await getDb().insert(canvasVersions).values({
          canvasId: row.id,
          authorType: "agent",
          authorId: agentId,
          snapshotText: file.content,
        })
      }

      return {
        ok: true,
        canvasId: row?.id,
        title: row?.title,
        kind: row?.kind,
      }
    },
  }

  const standardTools: ToolSpec[] = [shellTool, readFileTool, writeFileTool, listFilesTool, publishTool]

  if (profile !== "browser") {
    return standardTools
  }

  // Browser tools
  const browserOpenTool: ToolSpec = {
    name: "browser_open",
    description: "Navigate the persistent Chromium browser to a URL.",
    schema: z.object({
      url: z.string().url(),
    }),
    dangerous: false,
    execute: async (input: { url: string }) => {
      await client.ensure(agentId, orgId, profile)
      return client.browser(agentId, "open", input)
    },
  }

  const browserSnapshotTool: ToolSpec = {
    name: "browser_snapshot",
    description: "Get the accessibility tree and interactive elements of the current browser page.",
    schema: z.object({}),
    dangerous: false,
    execute: async () => {
      await client.ensure(agentId, orgId, profile)
      return client.browser(agentId, "snapshot", {})
    },
  }

  const browserClickTool: ToolSpec = {
    name: "browser_click",
    description: "Click an element by ref number or CSS selector.",
    schema: z.object({
      ref: z.union([z.string(), z.number()]).optional(),
      selector: z.string().optional(),
    }),
    dangerous: false,
    execute: async (input: { ref?: string | number; selector?: string }) => {
      await client.ensure(agentId, orgId, profile)
      return client.browser(agentId, "click", input)
    },
  }

  const browserTypeTool: ToolSpec = {
    name: "browser_type",
    description: "Type text into a focused or selected element.",
    schema: z.object({
      ref: z.union([z.string(), z.number()]).optional(),
      selector: z.string().optional(),
      text: z.string(),
      submit: z.boolean().optional(),
    }),
    dangerous: false,
    execute: async (input: { ref?: string | number; selector?: string; text: string; submit?: boolean }) => {
      await client.ensure(agentId, orgId, profile)
      return client.browser(agentId, "type", input)
    },
  }

  const browserExtractTool: ToolSpec = {
    name: "browser_extract",
    description: "Extract text, markdown, or HTML from the current page.",
    schema: z.object({
      selector: z.string().optional(),
      format: z.enum(["text", "markdown", "html"]).default("markdown"),
      maxChars: z.number().int().positive().max(100_000).default(30_000),
    }),
    dangerous: false,
    execute: async (input: { selector?: string; format?: "text" | "markdown" | "html"; maxChars?: number }) => {
      await client.ensure(agentId, orgId, profile)
      return client.browser(agentId, "extract", input)
    },
  }

  const browserScreenshotTool: ToolSpec = {
    name: "browser_screenshot",
    description: "Take a screenshot of the current page. Saves to /home/bot/.saaya/screens/ and returns preview.",
    schema: z.object({
      fullPage: z.boolean().optional(),
    }),
    dangerous: false,
    execute: async (input: { fullPage?: boolean }) => {
      await client.ensure(agentId, orgId, profile)
      return client.browser(agentId, "screenshot", input)
    },
  }

  return [
    ...standardTools,
    browserOpenTool,
    browserSnapshotTool,
    browserClickTool,
    browserTypeTool,
    browserExtractTool,
    browserScreenshotTool,
  ]
}
