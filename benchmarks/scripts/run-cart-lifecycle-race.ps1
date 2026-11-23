param(
    [ValidateRange(1,100)][int]$Repeats = 10,
    [ValidateSet('add','update','clear','add,update,clear')][string]$Modes = 'add,update,clear',
    [string]$BaseUrl = 'http://127.0.0.1:3000/api',
    [string]$MenuItemId = 'sandwich_beef'
)
$ErrorActionPreference = 'Stop'
$benchmarkDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resultsDir = Join-Path $benchmarkDir 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null
$runId = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$prefix = Join-Path $resultsDir "cart-lifecycle-$runId"
$log = "$prefix-console.log"
$rounds = "$prefix-rounds.csv"
$requests = "$prefix-requests.csv"
$script = Join-Path $benchmarkDir 'scenarios/cart-lifecycle-race.js'
$parser = Join-Path $PSScriptRoot 'parse-cart-lifecycle-logs.mjs'
$previous = @{}
foreach ($key in @('RUN_ID','REPEATS','MODES','BASE_URL','MENU_ITEM_ID')) {
    $previous[$key] = [Environment]::GetEnvironmentVariable($key,'Process')
}
try {
    $env:RUN_ID = $runId
    $env:REPEATS = "$Repeats"
    $env:MODES = $Modes
    $env:BASE_URL = $BaseUrl
    $env:MENU_ITEM_ID = $MenuItemId
    Write-Host "Cart lifecycle race: run=$runId, modes=$Modes, repeats=$Repeats"
    Write-Host 'SAFETY: Confirm Express points to LOCAL benchmark PostgreSQL, not Supabase.' -ForegroundColor Yellow
    & k6 run --console-output $log $script
    $k6Code = $LASTEXITCODE
    & node $parser $log $rounds $requests
    if ($LASTEXITCODE -ne 0) { throw 'Could not parse k6 structured output.' }
    Write-Host "Rounds CSV: $rounds"
    Write-Host "Requests CSV: $requests"
    Write-Host "Raw log: $log"
    if ($k6Code -ne 0) { Write-Warning "k6 exited ${k6Code}: correctness failure or runtime error. Inspect rounds CSV and log." }
} finally {
    foreach ($key in $previous.Keys) {
        [Environment]::SetEnvironmentVariable($key,$previous[$key],'Process')
    }
}
