# Feature #1 file changes

## New

- `server/data/resourceTypes.js`
- `server/models/Resource.js`
- `server/plugins/paperResourceSync.js`
- `server/routes/resourceRoutes.js`
- `server/scripts/backfillResources.js`
- `server/services/resourceMapper.js`
- `server/services/resourceMapper.test.js`
- `server/services/resourceService.js`
- `server/services/subjectService.js`
- `server/services/subjectService.test.js`

## Modified by installer

- `server/index.js`
- `server/models/Paper.js`
- `server/package.json`

## Database

Adds a new MongoDB collection named `resources` after you run `npm run migrate:resources` or when new Paper documents are saved.

No existing collection is deleted or renamed.
