const MAX_HANDLE_LENGTH = 39

/** Suggests a valid agent @handle from its display name. */
export function handleFromName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/-+$/, "")
  return slug.slice(0, MAX_HANDLE_LENGTH).replace(/-+$/, "")
}
