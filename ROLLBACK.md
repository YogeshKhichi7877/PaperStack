# Rollback Feature #1

Run from the PaperStack root:

```powershell
node .\rollback-feature-01.js
```

This restores the three code files backed up before installation and deletes Feature #1's newly added source files.

## Database note

Rollback intentionally does **not** delete the MongoDB `resources` collection because doing so would be a destructive data operation.

The old PaperStack code ignores that collection, so leaving it in MongoDB is safe. If you ever want it removed, do that separately only after confirming no later feature depends on it.
