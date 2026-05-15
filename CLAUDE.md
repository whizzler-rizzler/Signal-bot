# CLAUDE.md — Deep Owl (Breakout Signals)

> **Project:** Deep Owl · **Status:** Faza 0 (skeleton + planning docs) · **HEAD:** init
>
> **Ważne:** Ten projekt jest CAŁKOWICIE ODRĘBNY od parent `D:\Crypto\Claude` (market_maker / spread_reversion / live_mm). Mimo że folder leży w hierarchii pod `D:\Crypto\Claude\`, **NIE** loaduj parent `D:\Crypto\Claude\CLAUDE.md` jako kontekst dla tego projektu. Pracujemy tylko w obrębie `D:\Crypto\Claude\Breakout_signals\`.

## Projekt

**Deep Owl** — bot do wykrywania sygnałów breakout, składający się z 3 modułów:

1. **Early-stage accumulation detector** — wykrywa akumulację ZANIM wystąpi pump, na podstawie sygnałów wolumetrycznych, LP depth, holder distribution, buy/sell pressure
2. **Fresh projects monitor** — śledzi świeże launche (DEX-first), scoruje rokowanie, filtruje rugpulle, lifecycle tracking (Stage 0-4)
3. **Backtesting engine** — 5/15-min OHLCV świece, testuje strategie breakout na historycznych pumpach altów (Bollinger Squeeze, Volume Spike, RSI divergence)

**Output:** Telegram alerts + Web dashboard (FastAPI :8001) + **paper trading** (symulowany PnL, slippage, fees — bez realnego kapitału).

## Data sources

- **DEX-first (primary):** Dexscreener API + Birdeye API (multi-chain agregat)
- **CEX confirmation/backtest:** read-only reuse parent recorder data w `D:/Crypto/Claude/data/` (14 giełd, tick-level zstd archives od 2026-04-08)
- **Security checks:** RugCheck.xyz + GoPlus Security (rugpull filter, faza 5)
- **Social (opcjonalnie):** parent `Social_media_scanner` (sentiment pickup, faza 4+)

## Tech stack

- **Python 3.11+**, asyncio, aiohttp, FastAPI
- **DuckDB** (embedded analytics DB — NIE Postgres, NIE Redis)
- pyarrow, numpy, structlog, pydantic v2
- pytest + pytest-asyncio (target 80%+ coverage)
- ruff (lint + format), mypy (strict)

**Co NIE używamy:** Postgres, Redis, Kafka, Docker (na start), Kubernetes, real wallet integration.

## Build & Run

```powershell
# Setup (one-time)
cd D:\Crypto\Claude\Breakout_signals
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

# Skopiuj env template, uzupełnij keys (Birdeye, Telegram)
copy .env.example .env
# Edytuj .env

# Run CLI (od fazy 1+)
python -m deep_owl.cli --help

# Tests
pytest tests/ -q
pytest tests/ --cov=src/deep_owl --cov-report=term-missing

# Lint + types
ruff check src/ tests/
ruff format src/ tests/
mypy src/deep_owl/

# Dashboard (od fazy 6)
uvicorn deep_owl.output.dashboard:app --port 8001 --reload
```

## Style kodu

- Python 3.11+, type hints **wszędzie** (mypy strict)
- Logging przez `structlog` (JSON output dla dashboard ingestion), nigdy `print()`
- Każdy DEX/security adapter w osobnym pliku w `src/deep_owl/data/`
- Pydantic v2 dla wszystkich configs i API response models
- **Immutability:** nowe instancje DataClass/BaseModel zamiast mutacji
- Async wszędzie gdzie I/O — synchronous tylko dla pure compute

## Bezpieczeństwo

- **NIGDY** nie commituj `.env`, API keys, Telegram bot tokens
- `.gitignore` ma `data/`, `logs/`, `.env`, `*.duckdb` (sprawdź przed pierwszym commit)
- Dashboard (FastAPI :8001) bindowany na `127.0.0.1` (NIE 0.0.0.0) — local-only do fazy 6+
- Paper trading **nigdy** nie tknie real wallet (architektura wyklucza — wybór userowy)

## Workflow tier policy

Global rules z `~/.claude/CLAUDE.md` aplikują się TYLKO jeśli pomocne. TL;DR:

- **Tier S** (<20 linii, 1 plik): Edit + pytest, bez krytyków
- **Tier M** (20-100 linii, 2-5 plików): Analityk + 1x Krytyk + 1x Weryfikator
- **Tier L** (100+ linii / architecture / nowy moduł): + Architekt + 3x Krytyk + 2x Weryfikator

**Docs-only changes (np. update PHASES.md):** zwykle Tier S — bez krytyków.

## File hygiene (KRYTYCZNE — anti-sprawl)

Patrz [FILE_HYGIENE.md](FILE_HYGIENE.md). TL;DR:

- **Max 8 MD w root** + **max 5 ADR w docs/decisions/** — powyżej sygnał over-engineering
- **NIE twórz** `notes.md`, `todo.md`, `scratch.md`, `RESUME_PROMPT_*.md`
- Redakcja > append-only: stare info → DELETE lub sekcja "Historical"
- Single source of truth per topic: architektura tylko w `ARCHITECTURE.md`

## Linki — zacznij stąd

1. **[PHASES.md](PHASES.md)** — gdzie jesteśmy, co dalej
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — pełna architektura systemu
3. **[DATA_SOURCES.md](DATA_SOURCES.md)** — API matrix: endpointy, limity, koszty
4. **[GIT_WORKFLOW.md](GIT_WORKFLOW.md)** — branche, commit format, PR rules
5. **[FILE_HYGIENE.md](FILE_HYGIENE.md)** — meta-rules anti-sprawl
6. **[CHANGELOG.md](CHANGELOG.md)** — zamknięte fazy + tags
7. **`docs/deep_owl_v1.docx`** — 20-stronicowy pitch (snapshot na czas Fazy 0)
8. **`docs/decisions/`** — ADR (Architecture Decision Records) — dodawane tylko przy nietrywialnych decyzjach

## Doc currency check (session start)

Gdy zaczynasz sesję w tym projekcie:

1. `git log --oneline -5` → ostatnie commits
2. Read `PHASES.md` → current focus, otwarte taski
3. Read `CHANGELOG.md` → ostatni release tag
4. **NIE** loaduj `D:\Crypto\Claude\CLAUDE.md` (parent — market_maker, irrelevant)

## Co NIE jest częścią tego projektu

- Real wallet / private keys / on-chain transaction execution
- Per-chain native RPC adapters (Solana web3.py direct, Ethereum eth_call) — agregator API wystarczy
- Mobile app
- Multi-user / SaaS layer
- AWS deploy w fazach 0-6 (lokalne dev)
- Postgres / Redis / Kafka
- Powielanie funkcjonalności parent market_maker (live MM, spread reversion)
