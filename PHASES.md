# PHASES — Deep Owl

> **Current focus:** Faza 0 zamknięta (5 tagi planowane). Pivot v0.1.3 = hexagonal architecture: connectors / processors / engines / orchestrator + 4 nowe MD docs.
>
> **Top priority:** Big caps CEX-first, full coverage ~3000-4000 tokenów z 4 priorytetowych CEX. WS-first ingestion. 3 moduły. Hexagonal architecture.

## Faza 0 — Plan-as-docs ✅ (5 tagów)

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

### v0.1.2 (WS-first + Module 3 New Listings)
- [x] User feedback: full coverage + live 5m/15m + Module 3 New Listings
- [x] WebSocket-first ingestion strategy
- [x] Module 3 (re-added — CEX-only, NIE DEX)
- [x] Tier classification 1-4 (rozszerzone z 1-3)
- [x] DB schema v3 (added cex_symbols_snapshot, liquidations, new_listings, filters, matches, ws_status)

### v0.1.3 (hexagonal architecture + 4 nowe MD docs)
- [x] User feedback: top of the top architecture, każdy silnik osobny plik, connectors osobno, parallelism max
- [x] FILE_HYGIENE rozszerzona: limit 8 → 12 MD root, dodane hexagonal rules
- [x] RESUME_INDEX.md (NEW — router dla wszystkich dokumentów)
- [x] RESEARCH.md (NEW — methodology, signal theory, walk-forward, literature)
- [x] TECH_STACK.md (NEW — deep dive stack, parallelism: asyncio + multiprocessing)
- [x] DATABASE.md (NEW — DB deep dive: schema, partitioning, queries, migrations)
- [x] ARCHITECTURE.md MAJOR REWRITE: hexagonal architecture (connectors/processors/engines/orchestrator/parallelism)
- [x] DATA_SOURCES.md update: separated per connector (~25 plików)
- [x] PHASES.md update (ten plik): re-faza pod hexagonal
- [x] README.md + CLAUDE.md + CHANGELOG.md (entry v0.1.3)
- [x] Python skeleton refactor: dodaj connectors/, processors/, engines/, orchestrator/, parallelism/ dirs
- [x] Tag v0.1.3

**Verification (v0.1.3):**
1. `git log --oneline | head -10` → 5+ commits w sekwencji
2. `git tag` → v0.0.0, v0.1.0, v0.1.1, v0.1.2, v0.1.3
3. `ls *.md | wc -l` → 12 MD root (limit OK)
4. `find src/deep_owl -type d` pokazuje: connectors/, processors/, engines/, orchestrator/, parallelism/, output/, core/, data_models/

**Done criteria:** Wszystkie checkboxes ✅ + user otworzył docs i zatwierdził kierunek.

---

## Faza 1 — Repo bootstrap

**Cel:** Działający skeleton: venv + deps zainstalowane, pytest runs (placeholder), ruff + mypy clean. Foundation dla Fazy 2+.

- [ ] Setup venv: `python -m venv venv && .\venv\Scripts\Activate.ps1`
- [ ] `pip install -r requirements-dev.txt`
- [ ] `core/config.py` — Pydantic Settings z `.env` loading + per-module sub-configs
- [ ] `core/logger.py` — structlog setup (JSON output)
- [ ] `core/types.py` — common type aliases (Exchange, MarketType, Tier)
- [ ] `core/db/client.py` — DuckDBClient (connect, exec, query, ctx manager, migration runner)
- [ ] `core/db/schema.sql` — apply v3 schema (idempotent CREATE IF NOT EXISTS)
- [ ] `parallelism/pool.py` — ProcessPool wrapper (async-friendly)
- [ ] `parallelism/rate_limiter.py` — token bucket
- [ ] `parallelism/stream_multiplexer.py` — asyncio Queue multiplex
- [ ] `cli.py` — click-based CLI z subcommands stub (już mamy z v0.1.2, refresh)
- [ ] Placeholder tests w `tests/unit/core/`, `tests/unit/parallelism/`
- [ ] Pre-commit hook (`.pre-commit-config.yaml`): ruff + mypy + pytest -x
- [ ] Verify: `pytest -q` pass, `ruff check src/` clean, `mypy src/deep_owl/` clean
- [ ] Update `CHANGELOG.md`, tag `v0.2.0`

**Done criteria:** `pytest` + `ruff` + `mypy` clean. `deep-owl --version` wypisuje 0.2.0. DB schema applied bez błędów.

---

## Faza 2 — Universe Builder + Connectors universe layer

**Cel:** Lista ~3000-4000 realnych tokenów z 4 CEX-ów + tier classification. Foundation dla wszystkich kolejnych faz.

### Connectors
- [ ] `connectors/universe/coingecko.py` — async client z rate limit (30/min free)
- [ ] `connectors/universe/coinmarketcap.py` — async client (cross-check opt)
- [ ] `connectors/cex/binance/exchange_info.py` — pull symbols list (spot + futures)
- [ ] `connectors/cex/bybit/exchange_info.py`
- [ ] `connectors/cex/okx/exchange_info.py`
- [ ] `connectors/cex/coinbase/exchange_info.py`

### Data models
- [ ] `data_models/normalized.py` — `Token`, `TokenListing`, `CEXSymbolSnapshot`
- [ ] `data_models/connectors.py` — raw response models per CEX

### Engines
- [ ] `engines/universe_filter_engine.py` — łagodny filter (stablecoins/wrapped/dead exclude)
- [ ] `engines/tier_classifier_engine.py` — assign tier 1-4 z CoinGecko rank

### Orchestrator
- [ ] `orchestrator/universe_orchestrator.py` — daily rebuild pipeline
- [ ] CEX symbols daily snapshot writer (foundation dla Module 3 diff detection)

### CLI
- [ ] `deep-owl universe build` — full rebuild
- [ ] `deep-owl universe list --tier N` — show universe sample

### Tests
- [ ] Unit tests: filter engine, tier classifier (mocked input)
- [ ] Integration test: rebuild end-to-end z mocked CoinGecko/CMC responses
- [ ] Real API smoke test: pull 1 page CoinGecko → assert ~250 tokens

### Verification
- [ ] `tokens` table ma ~3000-4000 rows po pierwszym rebuild
- [ ] Top 100 zawiera BTC, ETH, SOL, ...
- [ ] Stablecoins/wrapped excluded
- [ ] CEX symbols snapshot zapisany dla wszystkich 4 CEX
- [ ] Update `CHANGELOG.md`, tag `v0.3.0`

**Done criteria:** `deep-owl universe build` runs, `tokens` ma ~3-4k rows, tier distribution sensowny.

---

## Faza 3a — CEX WebSocket connectors (KRYTYCZNE)

**Cel:** Live data ingestion z 4 CEX-ów via WebSocket. Persistent connections, multiplex, reconnect, in-memory buffer + bulk DuckDB INSERT.

### Connectors (ŻELAZNA SEPARACJA — każdy w osobnym pliku)
- [ ] `connectors/cex/binance/ws_spot.py` + `parsers.py`
- [ ] `connectors/cex/binance/ws_futures.py`
- [ ] `connectors/cex/bybit/ws_spot.py` + `parsers.py`
- [ ] `connectors/cex/bybit/ws_linear.py`
- [ ] `connectors/cex/okx/ws_public.py` + `parsers.py`
- [ ] `connectors/cex/coinbase/ws_public.py` + `parsers.py` (z custom kline aggregation z `matches`)
- [ ] `connectors/base.py` — `WSConnector` Protocol

### Data models
- [ ] `data_models/normalized.py` — `Kline`, `FundingRate`, `OpenInterest`, `Liquidation` (już z v0.1.2 — refresh)
- [ ] `data_models/connectors.py` — raw frame models per CEX (Pydantic v2 z aliases)

### Parallelism
- [ ] `parallelism/stream_multiplexer.py` — multiplex N WS streams → asyncio.Queue
- [ ] WS lifecycle manager (connect, subscribe, heartbeat, reconnect exp backoff)

### Storage
- [ ] `core/db/writers.py` — bulk INSERT pipeline (asyncio Queue → batched arrow → DuckDB)
- [ ] WS status persistence (`ws_status` table)

### Tests
- [ ] Unit tests parsers (golden fixtures: real frame samples)
- [ ] Integration test: mock WS server → adapter → assert frames parsed
- [ ] Reconnect test: simulated disconnect → reconnect succeeds w 5s
- [ ] Buffer flush test: 1000 events → INSERT do in-memory DuckDB

### CLI
- [ ] `deep-owl ws start --cex binance --market spot`
- [ ] `deep-owl ws start --cex all` (wszystkie 4 CEX)
- [ ] `deep-owl ws status` (z `ws_status` table query)

### Verification
- [ ] 13-17 connections active, ~4000 streams subscribed total
- [ ] Klines wpływają do DuckDB w ratio expected (288 candles/h per symbol)
- [ ] Reconnect graceful przy network blip
- [ ] Brak silent failures (każdy disconnect zalogowany)
- [ ] Update `CHANGELOG.md`, tag `v0.4.0`

**Done criteria:** WS streams działają continuous przez >24h bez crash. `klines_5m` rośnie zgodnie z expectations.

---

## Faza 3b — CEX REST connectors (backfill + sanity)

**Cel:** REST API dla one-time historical backfill + co 30min sanity reconcile vs WS.

### Connectors
- [ ] `connectors/cex/binance/rest_spot.py` + `rest_futures.py`
- [ ] `connectors/cex/bybit/rest_spot.py` + `rest_linear.py`
- [ ] `connectors/cex/okx/rest_public.py`
- [ ] `connectors/cex/coinbase/rest_public.py`
- [ ] `connectors/base.py` — `RESTConnector` Protocol

### Parallelism
- [ ] `parallelism/rate_limiter.py` — token bucket per CEX endpoint

### Engines (sanity check logic)
- [ ] `engines/ws_rest_divergence_engine.py` — compare last 5 bars WS vs REST, alert >0.1%

### Orchestrator
- [ ] `orchestrator/backfill_orchestrator.py` — bulk historical pull
- [ ] `orchestrator/sanity_reconcile_orchestrator.py` — co 30min job

### CLI
- [ ] `deep-owl backfill --token bitcoin --cex binance --from 2025-01-01`
- [ ] `deep-owl sanity reconcile`

### Tests
- [ ] Unit: rate limiter (burst + sustained)
- [ ] Integration: mock REST → backfill 1 symbol → assert klines w DB

### Verification
- [ ] Backfill 30 dni dla top 100 tokenów × 4 CEX < 30 min (rate limit aware)
- [ ] Sanity reconcile job runs bez warnings dla stable WS state
- [ ] Update `CHANGELOG.md`, tag `v0.4.1`

**Done criteria:** Backfill BTC/ETH/major alts od 2024-01-01 zakończony. Sanity job clean.

---

## Faza 4 — Backtesting Engine (Module 2)

**Cel:** Strategy interface + 4 strategie + walk-forward + HTML reports.

### Engines (każdy osobny plik)
- [ ] `engines/base.py` — `Engine` Protocol (już z v0.1.3 — refresh)
- [ ] `engines/backtest_breakout_consolidation.py` — Bollinger Squeeze + volume
- [ ] `engines/backtest_volume_spike.py`
- [ ] `engines/backtest_funding_squeeze.py`
- [ ] `engines/backtest_rsi_divergence.py`
- [ ] `engines/walk_forward_engine.py` — windows orchestration
- [ ] `engines/metrics_engine.py` — Sharpe, Sortino, Calmar, max DD, win rate, exposure
- [ ] `engines/slippage_engine.py` — linear model (base_bps + size/liquidity factor)
- [ ] `engines/fees_engine.py` — per-CEX fee table

### Processors
- [ ] `processors/numerical/ohlcv_aggregator.py` — tick → 5m/15m
- [ ] `processors/timeseries/rolling_stats.py` — SMA, EMA, std dev
- [ ] `processors/timeseries/divergence_detector.py` — RSI divergence

### Orchestrator
- [ ] `orchestrator/module2_orchestrator.py` — pipeline: load klines → walk-forward windows × strategies × universe → metrics aggregation

### Parallelism
- [ ] Use `parallelism/pool.py` ProcessPool dla parallel backtests (per token × per strategy)

### Output
- [ ] HTML report generator (plotly + jinja2 templates w `output/dashboard/templates/backtest_report.html`)
- [ ] Save report do `data/reports/backtest_{run_id}.html`

### CLI
- [ ] `deep-owl backtest --strategy funding_squeeze --universe top_100 --days 365`

### Tests
- [ ] Unit tests per strategy (golden cases: known input → known signals)
- [ ] Unit tests metrics (golden: known returns → expected Sharpe/Sortino/etc.)
- [ ] Walk-forward test: 90d data → 2 windows train+test
- [ ] Slippage/fees tests

### Verification
- [ ] End-to-end backtest na top 100 / 1 rok runs w <5 min
- [ ] HTML report wygenerowany z metrics + equity curve + per-trade scatter
- [ ] Coverage ≥ 80% dla `engines/backtest_*` i `engines/metrics_engine.py`
- [ ] Update `CHANGELOG.md`, tag `v0.5.0`

**Done criteria:** 4 strategie testowalne CLI. Walk-forward działa. Reports otwierają się w browser.

---

## Faza 5 — Module 1 (Accumulation Detector) + Module 3 (New Listings)

**Cel:** Big Cap Accumulation Detector — pełen end-to-end pipeline. Plus Module 3 New Listings Monitor.

### Module 1 engines (każdy osobny plik)
- [ ] `engines/volume_profile_engine.py` — Sygnał #1
- [ ] `engines/funding_skew_engine.py` — Sygnał #2
- [ ] `engines/oi_buildup_engine.py` — Sygnał #3
- [ ] `engines/cross_exchange_engine.py` — Sygnał #4
- [ ] `engines/liquidation_imbalance_engine.py` — Sygnał #5
- [ ] `engines/social_velocity_engine.py` — Sygnał #6 (opt)
- [ ] `engines/bid_ask_imbalance_engine.py` — Sygnał #7 (opt)

### Module 1 processors
- [ ] `processors/numerical/volume_profiler.py` — rolling 7d avg, ratio
- [ ] `processors/numerical/orderbook_l5_extractor.py` (z parent recorder)
- [ ] `processors/numerical/liquidation_aggregator.py` — 24h sums per side
- [ ] `processors/timeseries/correlation_matrix.py` — cross-exchange divergence

### Module 1 orchestrator
- [ ] `orchestrator/module1_orchestrator.py` — combine 7 engines, weighted sum, tier-aware threshold, alert gating

### Module 3 engines (osobne pliki)
- [ ] `engines/new_listings_detector_engine.py` — daily diff symbols → new listings
- [ ] `engines/filter_set_engine.py` — apply user filter sets

### Module 3 connectors + processors
- [ ] `connectors/announcements/binance_rss.py`
- [ ] `connectors/announcements/bybit_scrape.py`
- [ ] `connectors/announcements/okx_scrape.py`
- [ ] `connectors/announcements/coinbase_scrape.py`
- [ ] `processors/text/rss_parser.py`
- [ ] `processors/text/announcement_classifier.py`
- [ ] `processors/text/nlp_keyword_extractor.py` — meme keyword detection
- [ ] `processors/events/new_listing_extractor.py`
- [ ] `processors/events/delisting_detector.py`

### Module 3 orchestrator
- [ ] `orchestrator/module3_orchestrator.py` — 1h cron + filter matching
- [ ] Persist do `new_listings`, `new_listing_filters`, `new_listing_matches`

### Connectors (social opt)
- [ ] `connectors/social/parent_scanner_reader.py`
- [ ] `connectors/parent/recorder_reader.py` (dla orderbook L5)

### Cross-validation Module 1 (KRYTYCZNE pre-deploy)
- [ ] `engines/cross_validation_engine.py` — replay scoring na historical 1-2 lata
- [ ] Backtest precision/recall vs realne breakouts
- [ ] Tune wagi do precision > 0.4 OOS
- [ ] CLI: `deep-owl validate --start 2024-01-01 --end 2025-06-30`

### Tests
- [ ] Unit test każdego engine niezależnie (mocked input)
- [ ] Integration test orchestrator (mocked DB cursor + sample data)
- [ ] Property-based test scoring (random klines → invariants)

### CLI
- [ ] `deep-owl detect --token bitcoin` (single)
- [ ] `deep-owl run` (continuous mode)
- [ ] `deep-owl listings list --filter-set conservative`
- [ ] `deep-owl listings check --token X`
- [ ] `deep-owl validate --start ... --end ...`

### Verification
- [ ] Continuous mode runs >24h, signals zapisywane regularnie
- [ ] Cross-validation Module 1 precision > 0.4 OOS na out-of-sample
- [ ] Module 3 detection działa: nowe symbole pojawiają się w `new_listings` table
- [ ] Filter sets matching działa per config
- [ ] Update `CHANGELOG.md`, tag `v0.6.0`

**Done criteria:** End-to-end Module 1 + Module 3 running. Signals + new listings zapisywane. Cross-validation pass.

---

## Faza 6 — Output: Telegram + Dashboard + Paper Trader + Filter Sets UI

**Cel:** User-facing layer. Production-ready dla daily use.

### Output components
- [ ] `output/paper_trader.py` — simulated fill engine (CEX-aware fees + slippage)
- [ ] `output/telegram_bot.py` — bot + komendy
- [ ] `output/dashboard/app.py` — FastAPI main
- [ ] `output/dashboard/routes/universe.py`
- [ ] `output/dashboard/routes/signals.py`
- [ ] `output/dashboard/routes/new_listings.py`
- [ ] `output/dashboard/routes/filter_sets.py` — UI dla Module 3 user filters
- [ ] `output/dashboard/routes/paper_trades.py`
- [ ] `output/dashboard/routes/backtests.py`
- [ ] `output/dashboard/routes/settings.py`
- [ ] `output/dashboard/templates/*.html` (Jinja2 + HTMX)
- [ ] `output/dashboard/static/` (CSS, HTMX bundle, plotly)

### Wiring
- [ ] Signal → paper trade auto-open (configurable threshold)
- [ ] Telegram alert → po INSERT do signals z proper cooldown per tier
- [ ] Dashboard read-only z DuckDB (separate connection per request)

### Tests
- [ ] Integration: full flow ingest → signal → paper trade → dashboard show
- [ ] E2E smoke test: `deep-owl serve` → curl /signals → 200 OK
- [ ] Telegram bot smoke test (mocked bot.send_message)

### CLI
- [ ] `deep-owl serve` — uruchamia all workers (WS ingester + scorer + new listings + dashboard + telegram bot)

### Manual demo
- [ ] User uruchamia `deep-owl serve` lokalnie
- [ ] Otwiera http://127.0.0.1:8001/
- [ ] Widzi universe, live signals, new listings, paper trades
- [ ] Telegram bot odpowiada na komendy

### Verification
- [ ] End-to-end demo: WS ingester → M1/M3 wykryły sygnał → Telegram alert → dashboard pokazuje → paper trade otwarty → 24h later widzimy PnL
- [ ] Update `CHANGELOG.md`, tag `v0.7.0` lub `v1.0.0` (jeśli ready dla daily use)

**Done criteria:** Daily use possible. User otwiera `serve`, widzi alerts, edytuje filter sets, monitoruje paper PnL.

---

## Out of scope (CAŁKOWICIE — nie planujemy w tym projekcie)

- ❌ Fresh DEX projects monitor (Pumpfun, Raydium new pairs, Birdeye)
- ❌ Rugpull detection (RugCheck.xyz, GoPlus Security)
- ❌ DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)
- ❌ Per-chain native RPC (Solana web3.py, Ethereum eth_call)
- ❌ Real wallet / private keys / on-chain transactions
- ❌ Mobile app, multi-user SaaS
- ❌ Powielanie funkcjonalności parent market_maker
- ❌ Bonds / tradfi / S&P 500 connectors (out of crypto scope)

**Jeśli chcemy fresh DEX kiedyś — to OSOBNY projekt, nie Deep Owl.**

---

## Reguły aktualizacji tego pliku

1. **Co sesję:** zaznaczaj ukończone checkboxes, dopisuj odkryte sub-taski (wszystko musi się mieścić w fazie)
2. **Per fazę:** po zamknięciu fazy → update CHANGELOG + tag git
3. **Nie dodawaj fazy 7+ przed zamknięciem 6** (anti-scope-creep). Faza 7+ to v2 territory (auto-trading, on-chain, multi-user).
