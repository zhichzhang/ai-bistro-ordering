param(
    [string]$Levels = '5,10,20,50,100',
    [ValidateRange(1,20)][int]$Repeats = 3,
    [ValidateRange(0,20)][int]$Warmups = 3,
    [ValidateRange(1000,180000)][int]$RequestTimeoutMs = 90000,
    [ValidateRange(0,60000)][int]$PauseMs = 1500,
    [string]$BaseUrl = 'http://127.0.0.1:3000/api'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$env:LEVELS = $Levels
$env:REPEATS = [string]$Repeats
$env:WARMUPS = [string]$Warmups
$env:REQUEST_TIMEOUT_MS = [string]$RequestTimeoutMs
$env:PAUSE_MS = [string]$PauseMs
$env:BASE_URL = $BaseUrl

Push-Location $root
try {
    node (Join-Path $PSScriptRoot 'multi-kiosk-ordering.mjs')
    if ($LASTEXITCODE -ne 0) {
        throw "Multi-kiosk benchmark failed with exit code $LASTEXITCODE. Review CSV rows for the failing stage."
    }
} finally {
    Pop-Location
}
