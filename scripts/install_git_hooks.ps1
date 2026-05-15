# Deep Owl — git hooks installer
#
# Run RAZ po klonowaniu repo (lub po zmianie hooks):
#   .\scripts\install_git_hooks.ps1
#
# Kopiuje source-controlled hooks z scripts/hooks/ do .git/hooks/
# (.git/hooks/ NIE jest version-controlled, więc każdy clone wymaga re-install)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "==> Deep Owl git hooks installer" -ForegroundColor Cyan
Write-Host "    repo: $repoRoot"

$srcHooksDir = Join-Path $repoRoot "scripts\hooks"
$dstHooksDir = Join-Path $repoRoot ".git\hooks"

if (-not (Test-Path $srcHooksDir)) {
    Write-Host "ERROR: scripts/hooks/ not found" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $dstHooksDir)) {
    Write-Host "ERROR: .git/hooks/ not found — czy to git repo?" -ForegroundColor Red
    exit 1
}

# Kopiuj wszystkie hooks (poza .sample)
$hooks = Get-ChildItem $srcHooksDir | Where-Object { $_.Name -notmatch "\.sample$" }

foreach ($hook in $hooks) {
    $dst = Join-Path $dstHooksDir $hook.Name
    Copy-Item $hook.FullName $dst -Force
    Write-Host "    Installed: $($hook.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "==> Verify (test next commit):" -ForegroundColor Yellow
Write-Host "    git commit --allow-empty -m 'test: pre-commit hook'"
Write-Host ""
Write-Host "==> Bypass (NIE rekomendowane):" -ForegroundColor Yellow
Write-Host "    git commit --no-verify"
Write-Host ""
Write-Host "OK" -ForegroundColor Green
