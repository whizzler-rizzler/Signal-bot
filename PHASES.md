# PHASES — Deep Owl

> **Current focus:** Faza 0 zamknięta (v0.0.0), pivot na big caps CEX-first (v0.1.0 docs only)
>
> **Top priority:** ESTABLISHED big caps na CEX-ach (top ~5000 z CMC/CoinGecko po filtrowaniu). DEX/fresh OUT OF SCOPE.

## Faza 0 — Plan-as-docs ✅ + Pivot v0.1.0 (TERAZ)

**Cel:** 20-stronicowy DOCX + 8 MD files + skeleton repo + git init. **Bez kodu produkcyjnego — tylko docs + struktura.**

### v0.0.0 (initial)
- [x] Plan zatwierdzony przez user (ExitPlanMode)
- [x] `.gitignore` + `.env.example`
- [x] `pyproject.toml` + `requirements.txt` + `requirements-dev.txt`
- [x] Skeleton 8 MD + Python source + tests + scripts
- [x] DOCX v1 (DEX-first, fresh projects) — DEPRECATED przez pivot

### v0.1.0 (pivot — big caps CEX-first)
- [x] User feedback: "TOP 1 = big caps na giełdach od lat, fresh DEX = wywal"
- [x] Update CLAUDE.md (zakres, data sources, NIE fresh module)
- [x] Update ARCHITECTURE.md (kompletny refactor — 2 moduły zamiast 3, CEX REST primary)
- [x] Update PHASES.md (ten plik — nowe fazy)
- [x] Update DATA_SOURCES.md (CMC/CoinGecko/CEX REST primary, DEX/RugCheck/GoPlus REMOVED)
- [x] Update README.md (nowy elevator pitch)
- [x] Update CHANGELOG.md (entry v0.1.0)
- [x] Update db/schema.sql (drop fresh_projects, add token_listings/klines/funding/open_interest)
- [x] Update src/deep_owl/cli.py + data/models.py (nowe komendy + modele)
- [x] Regenerate DOCX (scripts/generate_docx.js → big caps content)
- [x] Tag v0.1.0

**Verification (v0.1.0):**
1. `git log --oneline | head -3` → 2 commity (v0.0.0 init + v0.1.0 pivot)
2. `grep -ri "dexscreener\|birdeye\|rugcheck\|goplus\|fresh" *.md src/ | wc -l` → 0 (lub tylko negative refs "out of scope")
3. `grep -ri "big.cap\|coinmarketcap\|coingecko" *.md` → kilkanaście matches w ARCHITECTURE/CLAUDE/DATA_SOURCES
4. Otwarcie `docs/deep_owl_v1.docx` → 20 stron z big caps content

**Done criteria:** Wszystkie checkboxes ✅ + user otworzył DOCX i zatwierdził pivot. Tag `v0.1.0`.

---

## Faza 1 — Repo bootstrap (next)

**Cel:** Działający skeleton: venv + deps zainstalowane, pytest runs (placeholder), ruff + mypy clean.

- [ ] Setup venv: `python -m venv venv && .\venv\Scripts\Activate.ps1`
- [ ] `pip install -r requirements-dev.txt`
- [ ] `src/deep_owl/config.py` — Pydantic Settings z `.env` loading + filter rules
- [ ] `src/deep_owl/logger.py` — structlog setup (JSON output)
- [ ] `src/deep_owl/db/client.py` — DuckDB wrapper (connect, exec, query, ctx manager)
- [ ] Migration runner (apply schema.sql na startup, idempotent)
- [ ] `src/deep_owl/cli.py` — click-based CLI z subcommands stub
- [ ] Placeholder tests w `tests/unit/test_config.py`, `tests/unit/test_db.py`
- [ ] Pre-commit hook (`.pre-commit-config.yaml`): ruff + mypy + pytest -x
- [ ] Verify: `pytest -q` pass, `ruff check src/` clean, `mypy src/deep_owl/` clean
- [ ] Update `CHANGELOG.md`, tag `v0.2.0`

**Done criteria:** `pytest` + `ruff` + `mypy` clean lokalnie. `deep-owl --version` wypisuje 0.2.0.

---

## Faza 2 — Universe Builder (CMC + CoinGecko)

**Cel:** Lista ~5000 realnych tokenów po filtrowaniu z 10k+ na CMC/CoinGecko. Tabele `tokens` + `token_listings`.

- [ ] `src/deep_owl/data/coinmarketcap.py` — async client z rate limit (333/dzień free), retry/backoff
  - Endpoint: `/v1/cryptocurrency/listings/latest` (paginated)
- [ ] `src/deep_owl/data/coingecko.py` — async client (30/min free)
  - Endpoint: `/coins/markets?vs_currency=usd&per_page=250&page=N`
- [ ] `src/deep_owl/modules/universe.py` — filter pipeline (market cap, volume, age, listings, blacklists)
- [ ] `src/deep_owl/data/cex_listings.py` — per-token resolver (na których CEX-ach jest listed, jakie symbole)
  - Per-CEX symbol mapping (BTC → Binance:BTCUSDT, Bybit:BTCUSDT, OKX:BTC-USDT, Coinbase:BTC-USD)
- [ ] DuckDB writer: upsert tokens + token_listings
- [ ] CLI: `deep-owl universe build` (force rebuild), `deep-owl universe list --tier 1` (show top 100)
- [ ] Tests: filter logic, blacklist matching, CEX resolver
- [ ] Verify: real run 1x → ~5000 rows w tokens (sanity check), top 100 zawiera BTC/ETH/SOL/...
- [ ] Update `CHANGELOG.md`, tag `v0.3.0`

**Done criteria:** `deep-owl universe build` runs do końca, `tokens` table ma ~5000 rows, filter daje sensowne top-100.

---

## Faza 3 — CEX REST API Adapters (klines + funding + OI)

**Cel:** Pull klines 5m/15m/1h + funding rates + open interest dla całego universe z 4 CEX-ów.

- [ ] `src/deep_owl/data/cex/binance.py` — async client
  - Endpoints: `/api/v3/klines`, `/fapi/v1/fundingRate`, `/fapi/v1/openInterest`
- [ ] `src/deep_owl/data/cex/bybit.py` — async client
  - Endpoints: `/v5/market/kline`, `/v5/market/funding/history`, `/v5/market/open-interest`
- [ ] `src/deep_owl/data/cex/okx.py` — async client
  - Endpoints: `/api/v5/market/candles`, `/api/v5/public/funding-rate-history`, `/api/v5/public/open-interest`
- [ ] `src/deep_owl/data/cex/coinbase.py` — async client (spot only, brak futures)
  - Endpoint: `/products/{id}/candles`
- [ ] Rate limit middleware (per CEX, per endpoint quota tracking)
- [ ] Normalizer: each response → wspólny `Kline`, `FundingRate`, `OpenInterest` model
- [ ] DuckDB writers: bulk INSERT do klines_5m, klines_15m, funding_history, open_interest
- [ ] Backfill mode: `deep-owl ingest --token BTC --from 2024-01-01` (historical pull)
- [ ] Realtime mode: `deep-owl ingest --realtime` (continuous polling)
- [ ] Tests: rate limiter, retry logic, normalization (golden fixtures)
- [ ] CLI: `deep-owl ingest --token X --cex Y --interval 5m`
- [ ] Verify: pull BTCUSDT klines z Binance × 1 dzień → 288 rows w klines_5m
- [ ] Update `CHANGELOG.md`, tag `v0.4.0`

**Done criteria:** Backfill pulls 1 rok klines top 100 tokenów (4 CEX) → kilka GB w DuckDB. Realtime mode runs stable.

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
- [ ] Tests: golden fixtures (znane przypadki), shape checks
- [ ] CLI: `deep-owl backtest --strategy funding_squeeze --universe top_100 --days 365`
- [ ] Verify: end-to-end run na top 100 / 1 rok, HTML z metrics + equity curve
- [ ] Update `CHANGELOG.md`, tag `v0.5.0`

**Done criteria:** Można uruchomić backtest z CLI, widzieć HTML report. Coverage ≥ 80%.

---

## Faza 5 — Module 1: Big Cap Accumulation Detector

- [ ] `src/deep_owl/modules/accumulation.py` — main detector class
- [ ] Signal extractors per sygnał (volume_rising, funding_skew, oi_buildup, cross_exchange_div, liq_imbalance, social, bid_ask)
- [ ] Weighted scoring + tier-aware thresholds
- [ ] Alert gating (per-token cooldown, daily cap)
- [ ] Persist do `signals` table
- [ ] Continuous mode: asyncio task co 5min iteruje universe
- [ ] **Cross-validation Modułu 1 na historical data** (replay scoring na last 1-2 lata, precision/recall vs realne breakouty)
- [ ] Wagi tuning na podstawie cross-validation
- [ ] Tests: każdy sygnał, scoring, tier logic
- [ ] CLI: `deep-owl detect --token BTC` (single), `deep-owl run` (continuous)
- [ ] Update `CHANGELOG.md`, tag `v0.6.0`

**Done criteria:** Continuous mode runs, signals zapisywane, cross-validation pokazuje precision > 0.4 (lepsza niż random) na out-of-sample.

---

## Faza 6 — Output: Telegram + Dashboard + Paper Trader

- [ ] `src/deep_owl/output/paper_trader.py` — simulated fill engine (CEX-aware fees)
- [ ] `src/deep_owl/output/telegram_bot.py` — bot + komendy
- [ ] `src/deep_owl/output/dashboard.py` — FastAPI app
- [ ] Templates HTML/HTMX dla 6 zakładek (Universe, Live Signals, Top Movers, Paper, Backtests, Settings)
- [ ] Wiring: signal → paper trade auto-open (configurable)
- [ ] Tests integration (full flow: ingest → signal → paper trade → dashboard show)
- [ ] CLI: `deep-owl serve` (uruchamia bot + dashboard + worker)
- [ ] Manual demo z user
- [ ] Update `CHANGELOG.md`, tag `v0.7.0` lub `v1.0.0` (jeśli ready)

**Done criteria:** End-to-end demo: ingester → Module 1 wykrył sygnał → Telegram alert → dashboard pokazuje → paper trade otwarty → 24h later widzimy PnL.

---

## Out of scope (CAŁKOWICIE — nie planujemy w tym projekcie)

- ❌ Fresh DEX projects monitor (Pumpfun, Raydium new pairs, Birdeye new tokens)
- ❌ Rugpull detection (RugCheck.xyz, GoPlus Security)
- ❌ DEX adapters (Dexscreener, Birdeye, Jupiter, Uniswap)
- ❌ Per-chain native RPC (Solana web3.py, Ethereum eth_call)
- ❌ Real wallet / private keys / on-chain transactions
- ❌ Mobile app, multi-user SaaS
- ❌ Powielanie funkcjonalności parent market_maker

**Jeśli chcemy fresh DEX kiedyś — to OSOBNY projekt, nie Deep Owl.**

---

## Reguły aktualizacji tego pliku

1. **Co sesję:** zaznaczaj ukończone checkboxes, dopisuj odkryte sub-taski (NIE bezpośrednie taski — wszystko musi się mieścić w fazie)
2. **Per fazę:** po zamknięciu fazy → update CHANGELOG + tag git
3. **Nie dodawaj fazy 7+ przed zamknięciem 6** (anti-scope-creep). Jeśli nowy duży pomysł → dyskusja z userem, decyzja czy to v2 czy refactor istniejącej fazy.
