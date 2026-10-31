/** Display handles for people, used only for @mentions and filtering. */
export function humanHandle(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 38)
}

export function humanMention(name: string): string {
  return `@${humanHandle(name)}`
}
