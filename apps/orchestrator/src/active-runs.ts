export interface ActiveRun {
  runId: string
  roomId: string
  controller: AbortController
}

const runs = new Map<string, ActiveRun>()

export function registerRun(runId: string, roomId: string): AbortController {
  const controller = new AbortController()
  runs.set(runId, { runId, roomId, controller })
  return controller
}

export function unregisterRun(runId: string): void {
  runs.delete(runId)
}

export function abortRun(runId: string): boolean {
  const run = runs.get(runId)
  if (!run) return false
  run.controller.abort(new Error("stopped by request"))
  return true
}

export function abortRoomRuns(roomId: string): number {
  let count = 0
  for (const run of runs.values()) {
    if (run.roomId === roomId) {
      run.controller.abort(new Error("superseded by a new human message"))
      count++
    }
  }
  return count
}

export function activeRunIds(): string[] {
  return [...runs.keys()]
}
