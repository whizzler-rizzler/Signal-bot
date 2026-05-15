# CLAUDE.md — Deep Owl (Breakout Signals)

> **Project:** Deep Owl · **Status:** Faza 0 (skeleton + planning docs) · **HEAD:** v0.1.2
>
> **Ważne:** Ten projekt jest CAŁKOWICIE ODRĘBNY od parent `D:\Crypto\Claude` (market_maker / spread_reversion / live_mm). Mimo że folder leży w hierarchii pod `D:\Crypto\Claude\`, **NIE** loaduj parent `D:\Crypto\Claude\CLAUDE.md` jako kontekst dla tego projektu. Pracujemy tylko w obrębie `D:\Crypto\Claude\Breakout_signals\`.

## Projekt

**Deep Owl** — bot do wykrywania sygnałów breakout NA BIG CAPS notowanych na CEX-ach. **TOP 1 PRIORITY: established tokeny ze stażem na giełdach.** Full coverage **wszystkiego co listed na min 1 z 4 priorytetowych CEX** (Binance/Bybit/OKX/Coinbase) = ~3000-4000 tokenów bez aggressive filter cap.

Składa się z **3 modułów** core:

1. **Module 1 — Big Cap Accumulation Detector** — wykrywa akumulację. 7 sygnałów: volume profile, funding rate skew, OI buildup, cross-exchange divergence, liquidation imbalance, social opt, bid/ask imbalance opt. Tier-aware threshold (Tier 1-4: top100 strict 70+, tail soft 55+).
2. **Module 2 — Backtesting Engine** — strategie breakout (Bollinger Squeeze, Volume Spike, Funding Squeeze, RSI Divergence) na historical klines REST API CEX. Walk-forward MANDATORY (anti-overfitting).
3. **Module 3 — New Listings Monitor (v0.1.2 NEW)** — detektor świeżych listingów CEX z **user-configurable filter sets** (config.yaml defaults + dashboard UI overrides runtime). CEX listings only — NIE DEX.

**Data ingestion: WebSocket-first.** 4 trwałe WS connections per CEX = wszystkie klines/funding/OI live push za $0, bez rate limitów. REST tylko dla backfill historycznego + sanity reconcile.

**Output:** Telegram alerts + Web dashboard (FastAPI :8001, 7 zakładek) + **paper trading** (symulowany PnL, slippage, fees — bez realnego kapitału).

**Co NIE jest częścią projektu:** fresh DEX projects monitor, RugCheck/GoPlus, Pumpfun, Dexscreener, Birdeye, Uniswap — wszystko WYWALONE.

## Universe — co skanujemy

- **Source:** `/exchangeInfo` per CEX (Binance, Bybit, OKX, Coinbase) — pełna lista symboli per CEX
- **Tier classification:** CoinGecko `/coins/markets` dla market cap rankings (Tier 1: rank 1-100, Tier 2: 101-500, Tier 3: 501-2000, Tier 4: >2000)
- **Filter pipeline łagodny** (NIE aggressive cap):
  - Wykluczamy stablecoins (USDT, USDC, DAI, ...)
  - Wykluczamy wrapped/synthetic (WBTC, stETH, jupSOL, ...)
  - Wykluczamy dead tokens (volume == 0 przez >7 dni)
  - Wymagamy: listed na min 1 z top 4 CEX
- **NO market cap minimum. NO age minimum. NO listing count minimum.**
- **Wynik:** ~3000-4000 tokenów monitorowanych.

## Data sources (per faza)

- **Faza 2:** CoinGecko (tier rankings) + CMC (cross-check opt) + CEX `/exchangeInfo` (symbols list)
- **Faza 3a:** **WebSocket** — Binance/Bybit/OKX/Coinbase live klines (5m + 15m), funding, OI, liquidations
- **Faza 3b:** CEX REST API (backfill historyczny + sanity reconcile co 30 min)
- **Faza 5:** Binance Announcements RSS + Bybit/OKX/Coinbase scrape (Module 3 New Listings)
- **Faza 5 opt:** Parent `Social_media_scanner` (Module 1 social signal)
- **Out of scope:** Dexscreener, Birdeye, RugCheck, GoPlus

## Tech stack

- **Python 3.11+**, asyncio, aiohttp, **websockets v12+** (krytyczne dla WS-first), FastAPI
- **DuckDB** (embedded, columnar — krytyczne dla skali ~25GB/rok)
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

# Skopiuj env template, uzupełnij keys (CMC opt, Telegram opt)
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

# WS ingester (od fazy 3a)
python -m deep_owl.cli ws start --cex binance --market spot

# Dashboard (od fazy 6)
uvicorn deep_owl.output.dashboard:app --port 8001 --reload
```

## Style kodu

- Python 3.11+, type hints **wszędzie** (mypy strict)
- Logging przez `structlog` (JSON output dla dashboard ingestion), nigdy `print()`
- Każdy CEX adapter w osobnym pliku w `src/deep_owl/data/cex/`
- Pydantic v2 dla wszystkich configs, API response models, WS frame parsing
- **Immutability:** nowe instancje DataClass/BaseModel zamiast mutacji
- Async wszędzie gdzie I/O — synchronous tylko dla pure compute
- **WS lifecycle awareness:** każdy WS adapter MUSI mieć: reconnect (exp backoff), heartbeat (ping/pong), replay buffer dla missed frames
- **Rate limit awareness:** REST adapter MUSI mieć `tenacity` retry + per-endpoint quota tracking

## Bezpieczeństwo

- **NIGDY** nie commituj `.env`, API keys (CMC, CoinGecko Pro, Telegram bot token)
- `.gitignore` ma `/data/`, `/logs/`, `.env`, `*.duckdb`, `~$*.docx`
- Dashboard bindowany na `127.0.0.1` (NIE 0.0.0.0) — local-only do fazy 6+
- Paper trading **nigdy** nie tknie real wallet (architektura wyklucza)

## Workflow tier policy

Global rules z `~/.claude/CLAUDE.md` aplikują się gdy pomocne. TL;DR:

- **Tier S** (<20 linii, 1 plik): Edit + pytest, bez krytyków
- **Tier M** (20-100 linii, 2-5 plików): Analityk + 1x Krytyk + 1x Weryfikator
- **Tier L** (100+ linii / architecture / nowy moduł): + Architekt + 3x Krytyk + 2x Weryfikator

**Docs-only changes (np. update PHASES.md):** zwykle Tier S.

## File hygiene (KRYTYCZNE — anti-sprawl)

Patrz [FILE_HYGIENE.md](FILE_HYGIENE.md). TL;DR:

- **Max 8 MD w root** + **max 5 ADR w docs/decisions/** + 1 long-form deck `docs/deep_owl_v1.md`
- **NIE twórz** `notes.md`, `todo.md`, `scratch.md`, `RESUME_PROMPT_*.md`
- Redakcja > append-only: stare info → DELETE lub sekcja "Historical"
- Single source of truth per topic: architektura tylko w `ARCHITECTURE.md`

## Linki — zacznij stąd

1. **[PHASES.md](PHASES.md)** — gdzie jesteśmy, co dalej
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — pełna architektura systemu
3. **[DATA_SOURCES.md](DATA_SOURCES.md)** — API matrix (WS + REST + announcements)
4. **[GIT_WORKFLOW.md](GIT_WORKFLOW.md)** — branche, commit format, PR rules
5. **[FILE_HYGIENE.md](FILE_HYGIENE.md)** — meta-rules anti-sprawl
6. **[CHANGELOG.md](CHANGELOG.md)** — zamknięte fazy + tags
7. **[docs/deep_owl_v1.md](docs/deep_owl_v1.md)** — long-form architecture deck (14 sekcji, v0.1.2)

## Doc currency check (session start)

Gdy zaczynasz sesję w tym projekcie:

1. `git log --oneline -5` → ostatnie commits
2. Read `PHASES.md` → current focus, otwarte taski
3. Read `CHANGELOG.md` → ostatni release tag
4. **NIE** loaduj `D:\Crypto\Claude\CLAUDE.md` (parent — market_maker, irrelevant)

## Co NIE jest częścią tego projektu

- Real wallet / private keys / on-chain transaction execution
- DEX adapters (Dexscreener, Birdeye, Pumpfun, Raydium, Jupiter)
- Fresh project monitoring DEX-side (RugCheck, GoPlus — out)
- Per-chain native RPC adapters (Solana web3.py, Ethereum eth_call)
- Mobile app
- Multi-user / SaaS layer
- AWS deploy w fazach 0-6 (lokalne dev)
- Postgres / Redis / Kafka
- Powielanie funkcjonalności parent market_maker (live MM, spread reversion)
