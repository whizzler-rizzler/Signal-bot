# Deep Owl — Breakout Signals Bot

Wykrywa **early-stage akumulację**, monitoruje **świeże projekty**, i **backtestuje strategie** breakout na historycznych pumpach altów.

**Status:** Faza 0 (planning + skeleton) · **Wersja:** 0.1.0 · **Output:** Telegram alerts + Web dashboard + paper trading

## Quick start

```powershell
cd D:\Crypto\Claude\Breakout_signals
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env
# Edytuj .env (Birdeye API key, Telegram token — opcjonalnie do fazy 6)

# Sprawdz testy + lint
pytest tests/ -q
ruff check src/

# (Od fazy 1+) CLI entry
python -m deep_owl.cli --help
```

## Co robi

| Moduł | Pytanie biznesowe | Output |
|---|---|---|
| **1. Accumulation Detector** | Czy token akumuluje się przed pumpem? | Score 0-100 + Telegram alert |
| **2. Fresh Projects Monitor** | Czy ten świeży token rokuje, czy to rugpull? | Lista z lifecycle stage + growth score |
| **3. Backtesting Engine** | Czy moja strategia zadziałałaby na historycznych pumpach? | HTML report z metrics (win rate, Sharpe, max DD) |

## Architektura w 3 zdaniach

DEX-first (Dexscreener + Birdeye multi-chain agregator) dla early signals + reuse parent CEX recorder data (`D:/Crypto/Claude/data/`) dla backtestu. DuckDB jako embedded storage. FastAPI dashboard + Telegram bot + paper trader z symulowanym slippage/fees.

Pełne szczegóły → [ARCHITECTURE.md](ARCHITECTURE.md). Pitch 20 stron → `docs/deep_owl_v1.docx`.

## Roadmap (fazy)

- **Faza 0** (NOW): planning docs + skeleton repo ✅
- **Faza 1:** repo bootstrap + CI + logger + settings
- **Faza 2:** DEX adapters (Dexscreener + Birdeye)
- **Faza 3:** Backtesting engine (5/15m candles, 3 strategie)
- **Faza 4:** Module 1 — Accumulation Detector
- **Faza 5:** Module 2 — Fresh Projects Monitor
- **Faza 6:** Output — Telegram + Dashboard + Paper Trader

Szczegółowy progress → [PHASES.md](PHASES.md).

## Tech stack

Python 3.11+ · asyncio · aiohttp · FastAPI · DuckDB · pydantic v2 · pytest · ruff · mypy

## Dokumentacja

| Plik | Zawartość |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Project context dla Claude Code (zastępuje parent context) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Pełna architektura (3 moduły, data flow, DB schema) |
| [PHASES.md](PHASES.md) | Plan faz z checkboxami, current focus |
| [DATA_SOURCES.md](DATA_SOURCES.md) | API matrix: Dexscreener, Birdeye, RugCheck, GoPlus, Telegram |
| [GIT_WORKFLOW.md](GIT_WORKFLOW.md) | Branch naming, commit format, PR rules |
| [FILE_HYGIENE.md](FILE_HYGIENE.md) | Meta-rules anti-sprawl (max 8 MD, max 5 ADR) |
| [CHANGELOG.md](CHANGELOG.md) | Release notes per fazę |

## Licencja

Proprietary. Solo dev tool, nie do dystrybucji.
