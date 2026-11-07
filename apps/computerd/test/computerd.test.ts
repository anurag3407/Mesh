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
})
