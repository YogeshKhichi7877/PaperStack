$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetRoot = Get-Location

if (-not (Test-Path (Join-Path $targetRoot "client")) -or -not (Test-Path (Join-Path $targetRoot "server"))) {
  Write-Error "Run this script from the PaperStack repository root (the folder containing client/ and server/)."
}

$source = Join-Path $root "server\scripts\backfillResources.js"
$target = Join-Path $targetRoot "server\scripts\backfillResources.js"
$backupDir = Join-Path $targetRoot ".paperstack-backups\feature-01.1"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path $target) {
  Copy-Item $target (Join-Path $backupDir "backfillResources.js") -Force
}
Copy-Item $source $target -Force

$envExample = Join-Path $targetRoot "server\.env.example"
if ((Test-Path $envExample) -and -not (Select-String -Path $envExample -Pattern '^MONGODB_URI_STANDARD=' -Quiet)) {
  Add-Content -Path $envExample -Value "`n# Optional non-SRV fallback if your network blocks MongoDB Atlas SRV DNS lookups.`nMONGODB_URI_STANDARD="
}

Write-Host "Feature #1.1 MongoDB DNS hotfix applied successfully." -ForegroundColor Green
Write-Host "Next: cd server; npm run migrate:resources:dry"
