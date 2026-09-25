# PaperStack Feature #1.1 — MongoDB DNS Migration Hotfix

This hotfix fixes `npm run migrate:resources:dry` failures such as:

`querySrv ECONNREFUSED _mongodb._tcp...`

It does not alter PaperStack data or resource mappings.

## Apply

Extract/copy this package into the PaperStack repository root so you can see `apply-hotfix-01-1.js` beside `client/` and `server/`.

From `D:\PaperStack>` run:

```powershell
node .\apply-hotfix-01-1.js
```

Then verify:

```powershell
node .\verify-hotfix-01-1.js
```

Then retry:

```powershell
cd server
npm run migrate:resources:dry
```

The migration now tries, in order:

1. `MONGODB_URI_STANDARD` when configured (no SRV lookup).
2. Your normal `MONGODB_URI` with system DNS.
3. Your normal `MONGODB_URI` again with `8.8.8.8` and `1.1.1.1` as DNS fallback.

If all three fail, the script prints a targeted message. In that uncommon case, add `MONGODB_URI_STANDARD` to `server/.env` using a standard/non-SRV Atlas connection string, or retry from a different network/hotspot.

## Safety

The previous migration script is backed up to:

`.paperstack-backups/feature-01.1/backfillResources.js`

No MongoDB data is changed by applying this hotfix. Only the migration connection logic is replaced.
