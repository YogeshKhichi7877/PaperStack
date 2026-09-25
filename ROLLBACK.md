# Rollback Feature #4

From the PaperStack root:

```powershell
node .\rollback-feature-04.js
```

The installer backs up `server/index.js`, `server/package.json`, and `client/src/App.js` before patching them. Rollback restores those files and removes the Feature #4 files.

No MongoDB rollback is required.
