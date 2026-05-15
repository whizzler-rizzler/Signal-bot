# PHASES — Deep Owl

> **Current focus:** Faza 0 zamknięta (4 tagi), pivot v0.1.2 dodał WebSocket-first + Module 3 (New Listings).
>
> **Top priority:** Big caps CEX-first, full coverage ~3000-4000 tokenów z 4 priorytetowych CEX (Binance/Bybit/OKX/Coinbase). DEX/fresh DEX OUT OF SCOPE.

## Faza 0 — Plan-as-docs ✅ (4 tagi)

**Cel:** docs + skeleton repo. **Bez kodu produkcyjnego.**

### v0.0.0 (initial)
- [x] Skeleton 8 MD + Python source + tests + scripts
- [x] DOCX v1 (DEX-first, deprecated)

### v0.1.0 (pivot — big caps CEX-first)
- [x] User feedback: "TOP 1 = big caps, fresh DEX wywal"
- [x] Refactor wszystkich docs na CEX-first scope
- [x] DB schema v2 (drop fresh_projects, add token_listings/klines/funding/OI)

### v0.1.1 (DOCX → MD swap)
- [x] DOCX zastąpiony pojedynczym `docs/deep_owl_v1.md`
- [x] Drop scripts/generate_docx.js

### v0.1.2 (WS-first + Module 3 — TERAZ)
- [x] User feedback: "pobieramy wszystko (~3-4k tokens), live 5m/15m, dodaj New Listings z user filters"
- [x] Update ARCHITECTURE.md (WS-first ingestion, 3 modules, łagodny filter)
- [x] Update docs/deep_owl_v1.md (sync z architekturą)
- [x] Update PHASES.md (ten plik — nowe fazy 3a/3b)
- [x] Update DATA_SOURCES.md (WS endpoints + RSS feeds)
- [x] Update CLAUDE.md (3 modules + WS-first)
- [x] Update README.md
- [x] Update CHANGELOG.md (entry v0.1.2)
- [x] Update db/schema.sql (add cex_symbols_snapshot, new_listings, new_listing_filters, ws_status)
- [x] Update src/deep_owl/data/models.py (add Kline, FundingRate, OI, NewListing, FilterSet models)
- [x] Update src/deep_owl/cli.py (nowe komendy: `ws start`, `listings list/check`)
- [x] Add requirements: `websockets>=12,<14`
- [x] Tag v0.1.2

**Verification:**
1. `git log --oneline | head -5` → 4 commity post-init
2. `git tag` → v0.0.0, v0.1.0, v0.1.1, v0.1.2
3. `grep -c "WebSocket" ARCHITECTURE.md docs/deep_owl_v1.md` → kilkadziesiąt matches
4. `grep "Module 3" docs/deep_owl_v1.md` → New Listings sekcja obecna

**Done criteria:** Wszystkie checkboxes ✅ + user otworzył MD i zatwierdził kierunek.

---

## Faza 1 — Repo bootstrap (next)

**Cel:** Działający skeleton: venv + deps zainstalowane, pytest runs, ruff + mypy clean.

- [ ] Setup venv: `python -m venv venv && .\venv\Scripts\Activate.ps1`
- [ ] `pip install -r requirements-dev.txt`
- [ ] `src/deep_owl/config.py` — Pydantic Settings z `.env` loading + filter rules + filter sets
- [ ] `src/deep_owl/logger.py` — structlog setup (JSON output)
- [ ] `src/deep_owl/db/client.py` — DuckDB wrapper (connect, exec, query, ctx manager)
- [ ] Migration runner (apply schema.sql na startup, idempotent)
- [ ] `src/deep_owl/cli.py` — click-based CLI z subcommands stub
- [ ] Placeholder tests w `tests/unit/test_config.py`, `tests/unit/test_db.py`
- [ ] Pre-commit hook (`.pre-commit-config.yaml`): ruff + mypy + pytest -x
- [ ] Verify: `pytest -q` pass, `ruff check src/` clean, `mypy src/deep_owl/` clean
- [ ] Update `CHANGELOG.md`, tag `v0.2.0`

**Done criteria:** `pytest` + `ruff` + `mypy` clean. `deep-owl --version` wypisuje 0.2.0.

---

## Faza 2 — Universe Builder + New Listings detection

**Cel:** Lista ~3000-4000 realnych tokenów z CEX `/exchangeInfo` + tier classification + daily diff dla new listings.

- [ ] `src/deep_owl/data/coingecko.py` — async client (30/min free)
  - Endpoint: `/coins/markets?per_page=250&page=N` dla tier rankings
- [ ] `src/deep_owl/data/coinmarketcap.py` — async client (cross-check opt)
- [ ] `src/deep_owl/data/cex/exchange_info.py` — pull symbols list per CEX (Binance/Bybit/OKX/Coinbase)
- [ ] `src/deep_owl/modules/universe.py` — łagodny filter pipeline (blacklists only, no aggressive cap)
- [ ] CEX listing detector — per-token symbol resolution per CEX
- [ ] **CEX symbols daily snapshot** — write `cex_symbols_snapshot` table
- [ ] **Diff detection** — porównaj today vs yesterday, INSERT do `new_listings` table
- [ ] CLI: `deep-owl universe build`, `universe list --tier 1`, `listings new --filter-set conservative`
- [ ] Tests: filter logic, blacklist matching, CEX symbol resolver, diff detector
- [ ] Verify: real run → ~3-4k rows w `tokens`, top 100 zawiera BTC/ETH/SOL/..., diff daje sensowne new listings
- [ ] Update `CHANGELOG.md`, tag `v0.3.0`

**Done criteria:** `deep-owl universe build` runs, `tokens` ma ~4k rows, `new_listings` ma dzisiejsze nowe symbole.

---

## Faza 3a — CEX WebSocket adapters (KRYTYCZNE)

**Cel:** Live data ingestion z 4 CEX-ów via WebSocket. Persistent connections, multiplex, reconnect logic.

- [ ] `src/deep_owl/data/cex/binance_ws.py` — Spot + Futures clients
  - Streams: `<sym>@kline_5m`, `<sym>@kline_15m`, `!markPrice@arr@1s`, `<sym>@openInterest`, `!forceOrder@arr`
- [ ] `src/deep_owl/data/cex/bybit_ws.py` — Spot + Linear clients
- [ ] `src/deep_owl/data/cex/okx_ws.py` — Public client (candles + funding + OI)
- [ ] `src/deep_owl/data/cex/coinbase_ws.py` — Public client (tickers + candles)
- [ ] WS lifecycle manager: connect, subscribe (multiplex), heartbeat, reconnect (exp backoff)
- [ ] Frame normalizer per CEX → common `Kline`, `FundingRate`, `OpenInterest`, `Liquidation` models
- [ ] In-memory buffer (asyncio.Queue) + bulk INSERT do DuckDB co 30s lub 1000 events
- [ ] Replay buffer: po reconnect >5s downtime → REST `/klines` pull dla missed bars
- [ ] WS status persistence (`ws_status` table) + health metrics
- [ ] Tests: mock WS server (aresponses-style), reconnect scenarios, buffer flushing
- [ ] CLI: `deep-owl ws start --cex binance --market spot`, `deep-owl ws status`
- [ ] Verify: 4 connections active, ~4000 streams subscribed, klines wpływają do DuckDB
- [ ] Update `CHANGELOG.md`, tag `v0.4.0`

**Done criteria:** WS streams działają continuous, `klines_5m` ma ~4000 tokens × 12 candles/h. Brak silent failures.

---

## Faza 3b — CEX REST adapters (backfill + sanity)

**Cel:** REST API dla one-time backfill historycznego + co 30min sanity reconcile vs WS.

- [ ] `src/deep_owl/data/cex/binance_rest.py` — klines historical + sanity check
- [ ] `src/deep_owl/data/cex/bybit_rest.py`
- [ ] `src/deep_owl/data/cex/okx_rest.py`
- [ ] `src/deep_owl/data/cex/coinbase_rest.py`
- [ ] Rate limit middleware (per CEX, per endpoint quota tracking via tenacity)
- [ ] Backfill orchestrator: `deep-owl backfill --token BTC --from 2025-01-01`
- [ ] Sanity reconcile job: random 50 tokens × 4 CEX co 30min, log divergence > 0.1%
- [ ] Tests: rate limiter, retry logic, normalization (golden fixtures)
- [ ] Verify: backfill 30 dni dla top 100 tokenów w <30 min, sanity job runs bez warnings
- [ ] Update `CHANGELOG.md`, tag `v0.4.1`

**Done criteria:** Backfill BTC/ETH/major alts od 2024-01-01 do DuckDB, sanity job clean.

---

## Faza 4 — Backtesting Engine

**Cel:** Strategy interface + 4 strategie + walk-forward + HTML reports na big caps historical.

- [ ] `src/deep_owl/modules/backtest/strategies/base.py` — Strategy Protocol
- [ ] `src/deep_owl/modules/backtest/strategies/breakout_consolidation.py` — Bollinger Squeeze + volume
- [ ] `src/deep_owl/modules/backtest/strategies/volume_spike.py` — vol > 3x SMA20 + close > prev high
- [ ] `src/deep_owl/modules/backtest/strategies/funding_squeeze.py` — negative funding + price consolidation
- [ ] `src/deep_owl/modules/backtest/strategies/rsi_divergence.py` — RSI oversold + bullish divergence
- [ ] `src/deep_owl/modules/backtest/slippage.py` — linear model
- [ ] `src/deep_owl/modules/backtest/fees.py` — per-CEX table
- [ ] `src/deep_owl/modules/backtest/metrics.py` — Sharpe, Sortino, Calmar, max DD, win rate
- [ ] `src/deep_owl/modules/backtest/engine.py` — walk-forward runner
- [ ] HTML report generator (plotly + jinja2)
- [ ] CLI: `deep-owl backtest --strategy funding_squeeze --universe top_100 --days 365`
- [ ] Verify: end-to-end run na top 100 / 1 rok, HTML z metrics + equity curve
- [ ] Update `CHANGELOG.md`, tag `v0.5.0`

**Done criteria:** Backtest CLI runs, HTML report z metrics. Coverage ≥ 80%.

---

## Faza 5 — Module 1 + Module 3

**Cel:** Accumulation Detector (M1) + New Listings Monitor (M3) — engine + scoring + filter logic.

### Module 1 — Big Cap Accumulation Detector

- [ ] `src/deep_owl/modules/accumulation.py` — main detector
- [ ] Signal extractors per sygnał (volume, funding, OI, cross-exchange, liquidation, social, bid/ask)
- [ ] Weighted scoring + tier-aware thresholds (4 tiers)
- [ ] Alert gating (per-token cooldown by tier, daily cap)
- [ ] Persist do `signals` table
- [ ] Continuous mode: asyncio task co 5min
- [ ] **Cross-validation Modułu 1** na historical 1-2 lata, precision/recall vs realne breakouts (price +20% w 24h)
- [ ] Wagi tuning na podstawie cross-validation results
- [ ] Tests: każdy sygnał, scoring, tier logic

### Module 3 — New Listings Monitor

- [ ] `src/deep_owl/modules/new_listings.py` — main monitor
- [ ] `src/deep_owl/data/announcements/binance_rss.py` — RSS parser
- [ ] `src/deep_owl/data/announcements/bybit_scrape.py`, `okx_scrape.py`, `coinbase_scrape.py`
- [ ] Filter set engine — apply user-defined filters per match
- [ ] Persist do `new_listings` + `new_listing_filters` tables
- [ ] CLI: `deep-owl listings list --filter-set conservative`, `listings check --token X`
- [ ] Continuous mode: asyncio task co 1h dla announcement check + co 24h dla CEX diff
- [ ] Tests: rugpull filter cases, growth scoring, filter set matching

**Done criteria:** Continuous mode runs, M1 signals + M3 listings zapisywane. Cross-validation M1 precision > 0.4 OOS.

- [ ] Update `CHANGELOG.md`, tag `v0.6.0`

---

## Faza 6 — Output: Telegram + Dashboard + Paper Trader + Filter Sets UI

- [ ] `src/deep_owl/output/paper_trader.py` — simulated fill engine (CEX-aware fees + slippage)
- [ ] `src/deep_owl/output/telegram_bot.py` — bot + komendy
- [ ] `src/deep_owl/output/dashboard.py` — FastAPI app
- [ ] Templates HTML/HTMX dla 7 zakładek (Universe, Live Signals, Top Movers, New Listings, Filter Sets, Paper, Backtests, Settings)
- [ ] **Filter Sets UI** — runtime tworzenie/edytowanie z live preview match count
- [ ] Wiring: signal → paper trade auto-open (configurable)
- [ ] Tests integration (full flow: ingest → signal → paper trade → dashboard show)
- [ ] CLI: `deep-owl serve` (uruchamia bot + dashboard + WS workers + scorer worker)
- [ ] Manual demo z user
- [ ] Update `CHANGELOG.md`, tag `v0.7.0` lub `v1.0.0`

**Done criteria:** End-to-end demo: WS ingester → M1/M3 wykryły → Telegram alert → dashboard pokazuje → paper trade otwarty → 24h later widzimy PnL.

---

## Out of scope (CAŁKOWICIE — nie planujemy w tym projekcie)

- ❌ Fresh DEX projects monitor (Pumpfun, Raydium new pairs, Birdeye)
- ❌ Rugpull detection (RugCheck.xyz, GoPlus Security)
- ❌ DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)
- ❌ Per-chain native RPC (Solana web3.py, Ethereum eth_call)
- ❌ Real wallet / private keys / on-chain transactions
- ❌ Mobile app, multi-user SaaS
- ❌ Powielanie funkcjonalności parent market_maker

**Jeśli chcemy fresh DEX kiedyś — to OSOBNY projekt, nie Deep Owl.**

---

## Reguły aktualizacji tego pliku

1. **Co sesję:** zaznaczaj ukończone checkboxes, dopisuj odkryte sub-taski (wszystko musi się mieścić w fazie)
2. **Per fazę:** po zamknięciu fazy → update CHANGELOG + tag git
3. **Nie dodawaj fazy 7+ przed zamknięciem 6** (anti-scope-creep)
