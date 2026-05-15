# CLAUDE.md — Deep Owl (Breakout Signals)

> **Project:** Deep Owl · **Status:** Faza 0 (skeleton + planning docs) · **HEAD:** v0.1.0
>
> **Ważne:** Ten projekt jest CAŁKOWICIE ODRĘBNY od parent `D:\Crypto\Claude` (market_maker / spread_reversion / live_mm). Mimo że folder leży w hierarchii pod `D:\Crypto\Claude\`, **NIE** loaduj parent `D:\Crypto\Claude\CLAUDE.md` jako kontekst dla tego projektu. Pracujemy tylko w obrębie `D:\Crypto\Claude\Breakout_signals\`.

## Projekt

**Deep Owl** — bot do wykrywania sygnałów breakout NA BIG CAPS notowanych na CEX-ach. **TOP 1 PRIORITY: established tokeny ze stażem na giełdach (top ~5000 po filtrowaniu z 10k+ na CMC/CoinGecko).**

Składa się z **2 modułów** core:

1. **Big Cap Accumulation Detector** — wykrywa akumulację na ~5000 realnych tokenów CEX-listed. Sygnały: volume profile, funding rate skew, open interest buildup, cross-exchange divergence, opcjonalnie social sentiment.
2. **Backtesting engine** — 5/15-min OHLCV historical klines z REST API CEX (Binance, Bybit, OKX, Coinbase) — testuje strategie breakout na big caps z pełną historią (Binance ma do 2017).

**Output:** Telegram alerts + Web dashboard (FastAPI :8001) + **paper trading** (symulowany PnL, slippage, fees — bez realnego kapitału).

**Co NIE jest częścią projektu:** fresh DEX projects monitor, RugCheck/GoPlus integration, Pumpfun, Raydium new pairs — wszystko WYWALONE z scope. Dexscreener może być rozważony **dopiero** po stabilnym MVP big caps (Faza 6+ jako optional extension).

## Universe — co skanujemy

- **Source:** CoinMarketCap API + CoinGecko API (token list + market cap rankings)
- **Filter logic** (configurable, defaults):
  - Market cap > $1M USD
  - 24h volume > $100k USD
  - Listed na min 2 z top 20 CEX-ów
  - Token age > 30 dni (eliminuje świeże launches — to inny scope)
  - NOT stablecoin (USDT, USDC, DAI, etc.)
  - NOT wrapped/synthetic 1:1 derivative (WBTC, stETH, jupSOL, etc. — same risk profile co underlying)
- **Output po filtrowaniu:** ~5000 tokens. Re-evaluate filter co 24h.

## Data sources (per faza)

- **Faza 2:** CoinMarketCap + CoinGecko (universe building)
- **Faza 3:** CEX REST API: Binance, Bybit, OKX, Coinbase (klines 5m/15m/1h, funding, open interest)
- **Faza 3+:** Reuse parent recorder dla BTC/ETH/HYPE tick precision (cross-validation)
- **Faza 5:** Social_media_scanner (parent reuse, opcjonalne dla sentiment signal)
- **Out of scope:** Dexscreener, Birdeye, RugCheck, GoPlus

## Tech stack

- **Python 3.11+**, asyncio, aiohttp, FastAPI
- **DuckDB** (embedded, columnar — krytyczne dla skali ~5000 tokens × klines)
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

# Skopiuj env template, uzupełnij keys (CMC, opcjonalnie Telegram)
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
- Każdy CEX/source adapter w osobnym pliku w `src/deep_owl/data/`
- Pydantic v2 dla wszystkich configs i API response models
- **Immutability:** nowe instancje DataClass/BaseModel zamiast mutacji
- Async wszędzie gdzie I/O — synchronous tylko dla pure compute
- **Rate limit awareness:** każdy CEX REST adapter MUSI mieć `tenacity` retry + per-endpoint quota tracking. CMC i CoinGecko mają drakońskie limity (free tier).

## Bezpieczeństwo

- **NIGDY** nie commituj `.env`, API keys (CMC, CoinGecko Pro, Telegram)
- `.gitignore` ma `data/`, `logs/`, `.env`, `*.duckdb`
- Dashboard bindowany na `127.0.0.1` (NIE 0.0.0.0) — local-only do fazy 6+
- Paper trading **nigdy** nie tknie real wallet (architektura wyklucza — wybór userowy)

## Workflow tier policy

Global rules z `~/.claude/CLAUDE.md` aplikują się TYLKO jeśli pomocne. TL;DR:

- **Tier S** (<20 linii, 1 plik): Edit + pytest, bez krytyków
- **Tier M** (20-100 linii, 2-5 plików): Analityk + 1x Krytyk + 1x Weryfikator
- **Tier L** (100+ linii / architecture / nowy moduł): + Architekt + 3x Krytyk + 2x Weryfikator

**Docs-only changes (np. update PHASES.md):** zwykle Tier S — bez krytyków.

## File hygiene (KRYTYCZNE — anti-sprawl)

Patrz [FILE_HYGIENE.md](FILE_HYGIENE.md). TL;DR:

- **Max 8 MD w root** + **max 5 ADR w docs/decisions/**
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
7. **`docs/deep_owl_v1.docx`** — 20-stronicowy pitch (zaktualizowany v0.1.0 — big caps focus)

## Doc currency check (session start)

Gdy zaczynasz sesję w tym projekcie:

1. `git log --oneline -5` → ostatnie commits
2. Read `PHASES.md` → current focus, otwarte taski
3. Read `CHANGELOG.md` → ostatni release tag
4. **NIE** loaduj `D:\Crypto\Claude\CLAUDE.md` (parent — market_maker, irrelevant)

## Co NIE jest częścią tego projektu

- Real wallet / private keys / on-chain transaction execution
- DEX adapters (Dexscreener, Birdeye, Pumpfun, Raydium, Jupiter)
- Fresh project monitoring / rugpull detection (RugCheck, GoPlus)
- Per-chain native RPC adapters (Solana web3.py, Ethereum eth_call)
- Mobile app
- Multi-user / SaaS layer
- AWS deploy w fazach 0-6 (lokalne dev)
- Postgres / Redis / Kafka
- Powielanie funkcjonalności parent market_maker (live MM, spread reversion)
