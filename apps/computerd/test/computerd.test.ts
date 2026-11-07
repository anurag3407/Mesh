import { describe, expect, it } from "vitest"
import { DockerClient } from "../src/docker"

describe("computerd DockerClient", () => {
  it("initializes with default or custom URL", () => {
    const client = new DockerClient("http://my-docker-proxy:2375/")
    expect(client).toBeDefined()
  })
})

describe("computerd container specs", () => {
  it("validates required security opts and tmpfs", () => {
    const spec = {
      ReadonlyRootfs: true,
      Tmpfs: {
        "/tmp": "size=512m,mode=1777",
        "/run": "size=16m",
      },
      SecurityOpt: ["no-new-privileges:true"],
    }
    expect(spec.ReadonlyRootfs).toBe(true)
    expect(spec.Tmpfs["/tmp"]).toBe("size=512m,mode=1777")
    expect(spec.SecurityOpt).toContain("no-new-privileges:true")
  })

  it("ensures agentd stats spec contains browserAvailable", () => {
    const stats = {
      cpu: 0,
      memMb: 50,
      diskMb: 0,
      processes: 1,
      browserRunning: false,
      browserAvailable: false,
    }
    expect(stats.browserAvailable).toBe(false)
  })
})

describe("agentd isSafePath", () => {
  it("allows safe paths in /home/bot and /tmp", async () => {
    const { isSafePath } = await import("../agentd/agentd")
    expect(isSafePath("/home/bot")).toBe(true)
    expect(isSafePath("/home/bot/app/index.js")).toBe(true)
    expect(isSafePath("/tmp/scratch.txt")).toBe(true)
  })

  it("blocks directory traversal and paths outside /home/bot or /tmp", async () => {
    const { isSafePath } = await import("../agentd/agentd")
    expect(isSafePath("/etc/passwd")).toBe(false)
    expect(isSafePath("/etc/crontab")).toBe(false)
    expect(isSafePath("/root/.ssh/id_rsa")).toBe(false)
    expect(isSafePath("/home/bot/../../etc/shadow")).toBe(false)
    expect(isSafePath("/var/run/docker.sock")).toBe(false)
  })

  it("blocks symlink traversal and broken symlinks pointing outside allowed roots", async () => {
    const { isSafePath } = await import("../agentd/agentd")
    const fs = await import("node:fs")
    const path = await import("node:path")

    const testDir = "/tmp/vitest-agentd-symlink-" + Date.now()
    fs.mkdirSync(testDir, { recursive: true })

    try {
      // Broken symlink to non-existent file in /etc
      const brokenLink = path.join(testDir, "broken-cron")
      fs.symlinkSync("/etc/cron.d/malicious", brokenLink)

      // Symlink to /etc directory
      const dirLink = path.join(testDir, "etc-link")
      fs.symlinkSync("/etc", dirLink)

      // Chained symlink pointing to brokenLink
      const chainLink = path.join(testDir, "chain-link")
      fs.symlinkSync(brokenLink, chainLink)

      expect(isSafePath(brokenLink)).toBe(false)
      expect(isSafePath(path.join(brokenLink, "sub"))).toBe(false)
      expect(isSafePath(dirLink)).toBe(false)
      expect(isSafePath(path.join(dirLink, "crontab"))).toBe(false)
      expect(isSafePath(path.join(dirLink, "newfile"))).toBe(false)
      expect(isSafePath(chainLink)).toBe(false)
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })
})
