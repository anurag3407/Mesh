# fs_write

Create a new file or completely overwrite an existing file.

## When to Use
- Writing new source files, scripts, or documentation.
- Complete rewrites of small files (< 50 lines).

## When NOT to Use
- Do NOT use for small changes in large files (use `fs_edit` to avoid accidental deletion).

## Example
```json
{
  "path": "/home/bot/app/README.md",
  "content": "# Project Title\n\nOverview of the system..."
}
```
