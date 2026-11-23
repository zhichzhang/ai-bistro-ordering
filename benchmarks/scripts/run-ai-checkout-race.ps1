param(
    [ValidateRange(1,100)][int]$Repeats = 2,
    [string]$MenuItemId = "sandwich_beef"
)
$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
if ([string]::IsNullOrWhiteSpace($env:BENCHMARK_TOKEN) -or $env:BENCHMARK_TOKEN.Length -lt 16) {
    throw "Set BENCHMARK_TOKEN to the same value used to start the local mock server (>=16 characters)."
}
$env:REPEATS = "$Repeats"
$env:MENU_ITEM_ID = $MenuItemId
Push-Location $projectRoot
try {
    node ./benchmarks/scripts/ai-checkout-race.mjs
    if ($LASTEXITCODE -ne 0) { Write-Warning "AI checkout race failed; inspect CSV." }
} finally {
    Pop-Location
    Remove-Item Env:REPEATS,Env:MENU_ITEM_ID -ErrorAction SilentlyContinue
}
