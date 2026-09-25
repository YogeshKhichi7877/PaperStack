$ErrorActionPreference = "Stop"
Write-Host "Applying PaperStack Feature #0..." -ForegroundColor Cyan
node .\apply-feature-00.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Feature #0 patch applied." -ForegroundColor Green
