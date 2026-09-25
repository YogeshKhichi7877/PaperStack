$ErrorActionPreference = "Stop"
Write-Host "Applying PaperStack Feature #2 - Dedicated Subject Pages..." -ForegroundColor Cyan
node .\apply-feature-02.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Feature #2 applied. Run node .\verify-feature-02.js next." -ForegroundColor Green
