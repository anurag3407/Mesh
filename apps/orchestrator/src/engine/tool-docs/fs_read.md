# fs_read

Read text content from files in your persistent container environment.

## When to Use
- Inspecting source code, config files, logs, or documentation.
- Reading specific sections of large files with `startLine` and `endLine`.

## When NOT to Use
- Do NOT use for binary files (images, archives, compiled binaries).
- Do NOT use if you only need to check if a file exists (prefer `fs_glob`).

## Example
```json
{
  "path": "/home/bot/app/src/index.ts",
  "startLine": 1,
  "endLine": 50
}
```

## Failure Modes
- Binary file detection will reject reading with an error.
- Files exceeding 2,000 lines return a continuation hint. Specify `startLine` to paginate.
