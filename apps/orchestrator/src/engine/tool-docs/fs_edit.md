# fs_edit

Perform surgical, exact string replacement in a file.

## When to Use
- Modifying existing code, fixing bugs, refactoring, or updating configurations.
- Prefer `fs_edit` over whole-file rewrites to prevent losing unrelated code.

## When NOT to Use
- Do NOT use for creating brand new files (use `fs_write`).
- Do NOT pass approximate or fuzzy strings; `oldString` must match byte-for-byte.

## Example
```json
{
  "path": "/home/bot/app/src/server.ts",
  "oldString": "const port = 3000",
  "newString": "const port = 8080"
}
```

## Failure Modes
- If `oldString` is not found, the tool errors. Always inspect the file first with `fs_read`.
- If `oldString` occurs multiple times and `replaceAll: true` is not set, the tool fails to prevent unintended edits.
