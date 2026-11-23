param(
    [ValidateRange(1,100)][int]$Repeats = 2,
    [ValidateSet("add-add","add-clear","both")][string]$Mode = "both"
)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
if ([string]::IsNullOrWhiteSpace($env:BENCHMARK_TOKEN) -or $env:BENCHMARK_TOKEN.Length -lt 16) {
    throw "BENCHMARK_TOKEN must match the local mock server token (at least 16 characters)."
}
$env:REPEATS = "$Repeats"
$env:MODES = if ($Mode -eq "both") { "add-add,add-clear" } else { $Mode }
Push-Location $root
try {
    node ./benchmarks/scripts/concurrent-ai-turns.mjs
    if ($LASTEXITCODE -ne 0) { Write-Warning "AI turns test failed; inspect CSV." }
} finally {
    Pop-Location
    Remove-Item Env:REPEATS,Env:MODES -ErrorAction SilentlyContinue
}
