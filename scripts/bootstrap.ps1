# Deep Owl — bootstrap script (PowerShell)
#
# Uruchom RAZ po klonowaniu repo:
#   .\scripts\bootstrap.ps1
#
# Idempotent: powtorne uruchomienie nic nie psuje.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "==> Deep Owl bootstrap" -ForegroundColor Cyan
Write-Host "    repo: $repoRoot"

# 1. Python check
$pyver = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: python not on PATH. Install Python 3.11+ first." -ForegroundColor Red
    exit 1
}
Write-Host "    python: $pyver"

# 2. Venv
if (-not (Test-Path ".\venv\Scripts\Activate.ps1")) {
    Write-Host "==> Creating venv (./venv)" -ForegroundColor Cyan
    python -m venv venv
} else {
    Write-Host "==> Venv already exists (./venv) — skipping create"
}

# 3. Activate + install
Write-Host "==> Activating venv" -ForegroundColor Cyan
. .\venv\Scripts\Activate.ps1

Write-Host "==> Upgrading pip" -ForegroundColor Cyan
python -m pip install --upgrade pip

Write-Host "==> Installing requirements-dev.txt" -ForegroundColor Cyan
pip install -r requirements-dev.txt

# 4. Install package editable
Write-Host "==> Installing deep_owl in editable mode" -ForegroundColor Cyan
pip install -e .

# 5. .env check
if (-not (Test-Path ".env")) {
    Write-Host "==> Creating .env from .env.example (uzupelnij API keys recznie)" -ForegroundColor Yellow
    Copy-Item .env.example .env
} else {
    Write-Host "==> .env already exists — skipping copy"
}

# 6. Smoke check
Write-Host "==> Smoke check: deep-owl --version" -ForegroundColor Cyan
deep-owl --version

Write-Host ""
Write-Host "OK. Next steps:" -ForegroundColor Green
Write-Host "  1. Edit .env — add Birdeye API key (faza 2+)"
Write-Host "  2. Read PHASES.md to see current focus"
Write-Host "  3. Run tests: pytest -q"
