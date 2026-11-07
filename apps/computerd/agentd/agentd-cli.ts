import { createConnection } from "node:net"

const SOCKET_PATH = process.env.AGENTD_SOCK || "/run/agentd.sock"
const input = process.argv[2] || ""

if (!input.trim()) {
  console.error("Usage: agentd-cli <json-string>")
  process.exit(1)
}

const client = createConnection(SOCKET_PATH, () => {
  client.write(input.trim() + "\n")
})

client.on("data", (data) => {
  process.stdout.write(data)
})

client.on("end", () => {
  process.exit(0)
})

client.on("error", (err) => {
  console.error(`[agentd-cli] connection error: ${err.message}`)
  process.exit(1)
})
