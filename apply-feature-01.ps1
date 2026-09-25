$ErrorActionPreference = "Stop"
Write-Host "Applying PaperStack Feature #1 - Unified Resource Architecture..." -ForegroundColor Cyan
node .\apply-feature-01.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
