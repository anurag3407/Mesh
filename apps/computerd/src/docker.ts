const DOCKER_URL = process.env.DOCKER_HOST || "http://docker-proxy:2375"

export interface DockerContainerConfig {
  Image: string
  name: string
  Env?: string[]
  Labels?: Record<string, string>
  HostConfig?: {
    Runtime?: string
    NetworkMode?: string
    ReadonlyRootfs?: boolean
    Tmpfs?: Record<string, string>
    Binds?: string[]
    NanoCpus?: number
    Memory?: number
    MemorySwap?: number
    PidsLimit?: number
    CapDrop?: string[]
    SecurityOpt?: string[]
    RestartPolicy?: { Name: string }
  }
}

export class DockerClient {
  private baseUrl: string

  constructor(url = DOCKER_URL) {
    this.baseUrl = url.replace(/\/+$/, "")
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...options.headers,
      },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(
        `Docker API ${options.method || "GET"} ${path} failed (${res.status}): ${body}`,
      )
    }
    const ct = res.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      return res.json()
    }
    return res
  }

  async inspectContainer(idOrName: string): Promise<any> {
    try {
      return await this.request(`/containers/${encodeURIComponent(idOrName)}/json`)
    } catch (e: any) {
      if (e.message.includes("404")) return null
      throw e
    }
  }

  async createContainer(config: DockerContainerConfig): Promise<{ Id: string }> {
    return this.request(`/containers/create?name=${encodeURIComponent(config.name)}`, {
      method: "POST",
      body: JSON.stringify(config),
    })
  }

  async startContainer(idOrName: string): Promise<void> {
    await this.request(`/containers/${encodeURIComponent(idOrName)}/start`, {
      method: "POST",
    })
  }

  async stopContainer(idOrName: string, timeout = 10): Promise<void> {
    await this.request(`/containers/${encodeURIComponent(idOrName)}/stop?t=${timeout}`, {
      method: "POST",
    })
  }

  async removeContainer(idOrName: string, force = true): Promise<void> {
    await this.request(`/containers/${encodeURIComponent(idOrName)}?force=${force}&v=true`, {
      method: "DELETE",
    })
  }

  async removeVolume(name: string, force = true): Promise<void> {
    await this.request(`/volumes/${encodeURIComponent(name)}?force=${force}`, {
      method: "DELETE",
    })
  }

  async execCreate(idOrName: string, cmd: string[]): Promise<{ Id: string }> {
    return this.request(`/containers/${encodeURIComponent(idOrName)}/exec`, {
      method: "POST",
      body: JSON.stringify({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: cmd,
      }),
    })
  }

  async execStart(execId: string): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/exec/${encodeURIComponent(execId)}/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ Detach: false, Tty: false }),
    })
    return res
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/_ping`)
      return res.ok
    } catch {
      return false
    }
  }
}
