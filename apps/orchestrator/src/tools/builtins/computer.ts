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
      "Execute a command in your persistent container shell. Working directory defaults to /home/bot. Output is streamed in real-time. Supports background jobs for servers and long tests.",
    schema: z.object({
      command: z.string().min(1).max(20_000),
      cwd: z.string().optional(),
      timeoutSeconds: z.number().int().min(1).max(300).default(60),
      background: z.boolean().optional().default(false),
    }),
    dangerous: (input) => isDestructiveCommand((input as { command: string }).command),
    execute: async (
      input: { command: string; cwd?: string; timeoutSeconds?: number; background?: boolean },
      signal,
      ctx,
    ) => {
      await client.ensure(agentId, orgId, profile)
      let seq = 0
      const effectiveToolCallId = ctx?.toolCallId ?? agentId

      const result = await client.exec(
        agentId,
        {
          cmd: input.command,
          cwd: input.cwd,
          timeoutMs: (input.timeoutSeconds || 60) * 1000,
          onChunk: (chunk) => {
            void broadcast(roomId, {
              type: "tool.output",
              toolCallId: effectiveToolCallId,
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

  const fsReadTool: ToolSpec = {
    name: "fs_read",
    description:
      "Read a text file from the persistent container environment with numbered lines. Supports line ranges and refuses binaries. (See engine/tool-docs/fs_read.md)",
    schema: z.object({
      path: z.string().min(1),
      startLine: z.number().int().positive().optional(),
      endLine: z.number().int().positive().optional(),
    }),
    dangerous: false,
    execute: async (input: { path: string; startLine?: number; endLine?: number }) => {
      await client.ensure(agentId, orgId, profile)
      const file = await client.readFile(agentId, { path: input.path, maxBytes: 2_000_000 })
      if (file.content.includes("\0")) {
        throw new Error("Cannot read binary file")
      }
      const lines = file.content.split("\n")
      const start = Math.max(1, input.startLine ?? 1)
      const end = Math.min(lines.length, input.endLine ?? lines.length)
      const sliced = lines.slice(start - 1, end)
      const cap = 2000
      const capped = sliced.slice(0, cap)
      const numbered = capped.map((line, idx) => `${start + idx} | ${line}`).join("\n")
      const continuation =
        sliced.length > cap
          ? `\n[2000 lines shown. To read more, specify startLine: ${start + cap}]`
          : ""
      return {
        path: input.path,
        totalLines: lines.length,
        linesReturned: capped.length,
        content: numbered + continuation,
      }
    },
  }

  const fsEditTool: ToolSpec = {
    name: "fs_edit",
    description:
      "Exact string replacement in a file. Fails if oldString is not found or ambiguous. Returns unified diff. (See engine/tool-docs/fs_edit.md)",
    schema: z.object({
      path: z.string().min(1),
      oldString: z.string().min(1),
      newString: z.string(),
      replaceAll: z.boolean().optional().default(false),
    }),
    dangerous: false,
    execute: async (input: {
      path: string
      oldString: string
      newString: string
      replaceAll?: boolean
    }) => {
      await client.ensure(agentId, orgId, profile)
      const file = await client.readFile(agentId, { path: input.path, maxBytes: 5_000_000 })
      const occurrences = file.content.split(input.oldString).length - 1
      if (occurrences === 0) {
        throw new Error(`Could not find exact match for oldString in ${input.path}`)
      }
      if (occurrences > 1 && !input.replaceAll) {
        throw new Error(
          `Found ${occurrences} occurrences of oldString in ${input.path}. Pass replaceAll: true or provide more surrounding context.`,
        )
      }
      const newContent = input.replaceAll
        ? file.content.replaceAll(input.oldString, input.newString)
        : file.content.replace(input.oldString, input.newString)

      await client.writeFile(agentId, { path: input.path, content: newContent })
      const diff = `--- ${input.path}\n+++ ${input.path}\n- ${input.oldString}\n+ ${input.newString}`
      return {
        ok: true,
        path: input.path,
        replacements: occurrences,
        diff,
      }
    },
  }

  const fsWriteTool: ToolSpec = {
    name: "fs_write",
    description:
      "Create or overwrite a file in your container environment. (See engine/tool-docs/fs_write.md)",
    schema: z.object({
      path: z.string().min(1),
      content: z.string().max(2_000_000),
    }),
    dangerous: false,
    execute: async (input: { path: string; content: string }) => {
      await client.ensure(agentId, orgId, profile)
      let existed = false
      try {
        await client.readFile(agentId, { path: input.path, maxBytes: 10 })
        existed = true
      } catch {}
      await client.writeFile(agentId, { path: input.path, content: input.content })
      return {
        ok: true,
        path: input.path,
        action: existed ? "overwritten" : "created",
        bytes: input.content.length,
      }
    },
  }

  const fsGlobTool: ToolSpec = {
    name: "fs_glob",
    description:
      "Find files matching glob pattern(s) in container filesystem, mtime-sorted. (See engine/tool-docs/fs_glob.md)",
    schema: z.object({
      pattern: z.string().min(1),
      path: z.string().optional().default("/home/bot"),
    }),
    dangerous: false,
    execute: async (input: { pattern: string; path?: string }) => {
      await client.ensure(agentId, orgId, profile)
      const base = input.path || "/home/bot"
      const res = await client.exec(agentId, {
        cmd: `find ${base} -name "${input.pattern}" -type f -printf "%T@ %p\\n" 2>/dev/null | sort -nr | head -n 100 | cut -d' ' -f2-`,
      })
      const files = res.stdout.trim().split("\n").filter(Boolean)
      return {
        path: base,
        pattern: input.pattern,
        matches: files,
        count: files.length,
      }
    },
  }

  const fsGrepTool: ToolSpec = {
    name: "fs_grep",
    description:
      "Search for regex/string pattern across files using ripgrep with line numbers. (See engine/tool-docs/fs_grep.md)",
    schema: z.object({
      query: z.string().min(1),
      path: z.string().optional().default("/home/bot"),
      fileType: z.string().optional(),
    }),
    dangerous: false,
    execute: async (input: { query: string; path?: string; fileType?: string }) => {
      await client.ensure(agentId, orgId, profile)
      const base = input.path || "/home/bot"
      const typeFilter = input.fileType ? `-t ${input.fileType}` : ""
      const res = await client.exec(agentId, {
        cmd: `rg -n --no-heading --color never -m 100 ${typeFilter} -- "${input.query}" ${base}`,
      })
      return {
        query: input.query,
        path: base,
        output: res.stdout || "(no matches found)",
      }
    },
  }

  const gitStatusTool: ToolSpec = {
    name: "git_status",
    description: "Check git working tree status in your repository.",
    schema: z.object({
      cwd: z.string().optional().default("/home/bot"),
    }),
    dangerous: false,
    execute: async (input: { cwd?: string }) => {
      await client.ensure(agentId, orgId, profile)
      const res = await client.exec(agentId, {
        cmd: "git status -s",
        cwd: input.cwd,
      })
      return { status: res.stdout || "(clean working tree)" }
    },
  }

  const gitDiffTool: ToolSpec = {
    name: "git_diff",
    description: "View git diff of unstaged and staged changes.",
    schema: z.object({
      cwd: z.string().optional().default("/home/bot"),
      staged: z.boolean().optional().default(false),
    }),
    dangerous: false,
    execute: async (input: { cwd?: string; staged?: boolean }) => {
      await client.ensure(agentId, orgId, profile)
      const flag = input.staged ? "--staged" : ""
      const res = await client.exec(agentId, {
        cmd: `git diff ${flag}`,
        cwd: input.cwd,
      })
      return { diff: res.stdout || "(no changes)" }
    },
  }

  const gitCommitTool: ToolSpec = {
    name: "git_commit",
    description: "Commit staged or tracked changes in git repository.",
    schema: z.object({
      message: z.string().min(1),
      cwd: z.string().optional().default("/home/bot"),
      all: z.boolean().optional().default(true),
    }),
    dangerous: true,
    execute: async (input: { message: string; cwd?: string; all?: boolean }) => {
      await client.ensure(agentId, orgId, profile)
      const flag = input.all ? "-a" : ""
      const res = await client.exec(agentId, {
        cmd: `git commit ${flag} -m ${JSON.stringify(input.message)}`,
        cwd: input.cwd,
      })
      return { output: res.stdout || res.stderr, exitCode: res.exitCode }
    },
  }

  const gitPushTool: ToolSpec = {
    name: "git_push",
    description:
      "Push committed changes to remote git repository through Secret Broker proxy.",
    schema: z.object({
      cwd: z.string().optional().default("/home/bot"),
      remote: z.string().optional().default("origin"),
      branch: z.string().optional(),
    }),
    dangerous: true,
    execute: async (input: { cwd?: string; remote?: string; branch?: string }) => {
      await client.ensure(agentId, orgId, profile)
      const branch = input.branch || ""
      const res = await client.exec(agentId, {
        cmd: `git push ${input.remote || "origin"} ${branch}`.trim(),
        cwd: input.cwd,
      })
      return { output: res.stdout || res.stderr, exitCode: res.exitCode }
    },
  }

  // Aliases for backwards compatibility
  const readFileTool: ToolSpec = {
    name: "computer_read_file",
    description: "Read a file from your persistent container environment (alias to fs_read).",
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
    description:
      "Write content to a file in your persistent container (/home/bot or /tmp) (alias to fs_write).",
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

  const standardTools: ToolSpec[] = [
    shellTool,
    fsReadTool,
    fsEditTool,
    fsWriteTool,
    fsGlobTool,
    fsGrepTool,
    gitStatusTool,
    gitDiffTool,
    gitCommitTool,
    gitPushTool,
    readFileTool,
    writeFileTool,
    listFilesTool,
    publishTool,
  ]

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
    execute: async (input: {
      ref?: string | number
      selector?: string
      text: string
      submit?: boolean
    }) => {
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
    execute: async (input: {
      selector?: string
      format?: "text" | "markdown" | "html"
      maxChars?: number
    }) => {
      await client.ensure(agentId, orgId, profile)
      return client.browser(agentId, "extract", input)
    },
  }

  const browserScreenshotTool: ToolSpec = {
    name: "browser_screenshot",
    description:
      "Take a screenshot of the current page. Saves to /home/bot/.saaya/screens/ and returns preview.",
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
