export interface CanvasEdit {
  search: string
  replace: string
}

export interface CanvasSplice {
  from: number
  to: number
  insert: string
}

export interface CanvasPatchPlan {
  text: string
  splices: CanvasSplice[]
}

export class CanvasPatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CanvasPatchError"
  }
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let index = haystack.indexOf(needle)
  while (index !== -1) {
    count++
    index = haystack.indexOf(needle, index + needle.length)
  }
  return count
}

/**
 * Plans sequential search/replace edits. Every search must match exactly once in
 * the text as it exists at that point in the sequence. Splice positions refer to
 * that evolving text, so applying them in order to a Y.Text is safe.
 */
export function planCanvasPatch(snapshot: string, edits: CanvasEdit[]): CanvasPatchPlan {
  if (edits.length === 0) {
    return { text: snapshot, splices: [] }
  }
  let text = snapshot
  const splices: CanvasSplice[] = []
  for (const [i, edit] of edits.entries()) {
    if (typeof edit.search !== "string" || edit.search.length === 0) {
      throw new CanvasPatchError(`edit ${i + 1}: search must not be empty`)
    }
    const matches = countOccurrences(text, edit.search)
    if (matches === 0) {
      throw new CanvasPatchError(`edit ${i + 1}: search text not found`)
    }
    if (matches > 1) {
      throw new CanvasPatchError(
        `edit ${i + 1}: search text matched ${matches} times; make it unique`,
      )
    }
    const from = text.indexOf(edit.search)
    const to = from + edit.search.length
    text = text.slice(0, from) + edit.replace + text.slice(to)
    splices.push({ from, to, insert: edit.replace })
  }
  return { text, splices }
}
