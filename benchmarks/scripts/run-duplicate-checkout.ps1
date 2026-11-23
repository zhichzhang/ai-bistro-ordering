param(
  [string]$Levels = "20,50,100",
  [int]$Repeats = 3,
  [string]$BaseUrl = "http://127.0.0.1:3000/api",
  [string]$MenuItemId = "sandwich_beef",
  [int]$BatchPerHost = 0,
  [switch]$AllowExtreme
)

$ErrorActionPreference = 'Stop'
$benchmarkDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resultsDir = Join-Path $benchmarkDir 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

$runId = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
$prefix = Join-Path $resultsDir "duplicate-checkout-$runId"
$consoleLog = "$prefix-console.log"
$roundCsv = "$prefix-rounds.csv"
$requestCsv = "$prefix-requests.csv"
$script = Join-Path $benchmarkDir 'scenarios/duplicate-checkout-stress.js'
$parser = Join-Path $PSScriptRoot 'parse-checkout-logs.mjs'

$before = @{}
foreach ($key in @('LEVELS','REPEATS','BASE_URL','MENU_ITEM_ID','BATCH_PER_HOST','RUN_ID','ALLOW_EXTREME')) {
  $before[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
try {
  $env:LEVELS = $Levels
  $env:REPEATS = "$Repeats"
  $env:BASE_URL = $BaseUrl
  $env:MENU_ITEM_ID = $MenuItemId
  $env:RUN_ID = $runId
  $env:ALLOW_EXTREME = if ($AllowExtreme) { '1' } else { '0' }
  if ($BatchPerHost -gt 0) { $env:BATCH_PER_HOST = "$BatchPerHost" }
  else { [Environment]::SetEnvironmentVariable('BATCH_PER_HOST', $null, 'Process') }

  Write-Host "Run ID: $runId"
  Write-Host "Local API: $BaseUrl"
  Write-Host "Levels: $Levels; Repeats: $Repeats"
  Write-Host 'IMPORTANT: Verify Express uses the local benchmark PostgreSQL database.' -ForegroundColor Yellow
  & k6 run --console-output $consoleLog $script
  $k6ExitCode = $LASTEXITCODE

  & node $parser $consoleLog $roundCsv $requestCsv
  $parseExitCode = $LASTEXITCODE

  Write-Host "Raw log: $consoleLog"
  Write-Host "Rounds CSV: $roundCsv"
  Write-Host "Requests CSV: $requestCsv"
  if ($parseExitCode -ne 0) { throw "CSV parsing failed (exit code $parseExitCode)." }
  if ($k6ExitCode -ne 0) {
    Write-Warning "k6 exited $k6ExitCode because correctness checks failed (expected before checkout fix), or because of a runtime error. Inspect the CSV and log."
  }
} finally {
  foreach ($key in $before.Keys) {
    [Environment]::SetEnvironmentVariable($key, $before[$key], 'Process')
  }
}
