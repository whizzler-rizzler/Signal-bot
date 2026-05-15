# PHASES — Deep Owl

> **Current focus:** Faza 0 — planning docs + skeleton repo
>
> **Last update:** {auto-update każda sesja}

## Faza 0 — Plan-as-docs (TERAZ)

**Cel:** 20-stronicowy DOCX + 8 MD files + skeleton repo + git init. **Bez kodu produkcyjnego — tylko docs + struktura.**

- [x] Plan zatwierdzony przez user (ExitPlanMode)
- [x] `.gitignore` + `.env.example`
- [x] `pyproject.toml` + `requirements.txt` + `requirements-dev.txt`
- [x] `CLAUDE.md` (replaces parent context bleed)
- [x] `README.md` (1-ekran quick start)
- [x] `ARCHITECTURE.md` (single source of truth dla architektury)
- [x] `PHASES.md` (ten plik)
- [x] `DATA_SOURCES.md` (API matrix)
- [x] `GIT_WORKFLOW.md` (commit format, branche, PR rules)
- [x] `FILE_HYGIENE.md` (anti-sprawl rules)
- [x] `CHANGELOG.md` (initial)
- [x] Python skeleton (`src/deep_owl/__init__.py` + `cli.py` stub + warstwy)
- [x] Tests skeleton (`tests/__init__.py`)
- [x] `scripts/bootstrap.ps1`
- [x] `docs/decisions/.gitkeep`
- [x] `docs/deep_owl_v1.docx` (20 stron generowany przez docx skill)
- [x] `git init` + initial commit + tag `v0.0.0`

**Verification (post-Faza 0):**
1. `git log --oneline` w `Breakout_signals/` → init commit + skeleton commit
2. `ls docs/` → 1 docx + `decisions/`
3. Otwarcie `docs/deep_owl_v1.docx` → 20 stron, czytelne
4. `cat CLAUDE.md | grep market_maker` → ZERO matches (clean isolation)
5. `python -c "import sys; sys.path.insert(0, 'src'); import deep_owl"` → OK (po setup venv)

**Done criteria:** Wszystkie checkboxes ✅ + user otworzył DOCX i zatwierdził. Tag `v0.0.0`.

---

## Faza 1 — Repo bootstrap (next)

**Cel:** Działający skeleton: venv + deps zainstalowane, pytest runs (placeholder), ruff + mypy clean.

- [ ] Setup venv: `python -m venv venv && .\venv\Scripts\Activate.ps1`
- [ ] `pip install -r requirements-dev.txt`
- [ ] `src/deep_owl/config.py` — Pydantic Settings z `.env` loading
- [ ] `src/deep_owl/logger.py` — structlog setup (JSON output)
- [ ] `src/deep_owl/db/client.py` — DuckDB wrapper (connect, exec, query, ctx manager)
- [ ] `src/deep_owl/db/schema.sql` — wszystkie tabele z ARCHITECTURE.md
- [ ] Migration runner (apply schema na startup, idempotent)
- [ ] `src/deep_owl/cli.py` — click-based CLI z subcommands: `setup`, `version`
- [ ] Placeholder tests w `tests/unit/test_config.py`, `tests/unit/test_db.py`
- [ ] Pre-commit hook (`.pre-commit-config.yaml`): ruff + mypy + pytest -x
- [ ] CI config (jeśli decydujemy GitHub Actions / lokalne hook only — TBD)
- [ ] Verify: `pytest -q` pass, `ruff check src/` clean, `mypy src/deep_owl/` clean
- [ ] Update `CHANGELOG.md`, tag `v0.1.0`

**Done criteria:** `pytest` + `ruff` + `mypy` wszystko clean lokalnie. `deep-owl --version` wypisuje 0.1.0.

---

## Faza 2 — DEX data adapters

**Cel:** Dexscreener + Birdeye async clients, normalized do `TokenSnapshot`, persist do DuckDB.

- [ ] `src/deep_owl/data/models.py` — `TokenSnapshot`, `PairSnapshot`, `Holder`, `Liquidity` (Pydantic v2)
- [ ] `src/deep_owl/data/dexscreener.py` — async client z rate limit (60/min), retry/backoff via tenacity
  - Endpoints: `/tokens/{addr}`, `/pairs/{chain}/{pair}`, `/search`, `/token-profiles/latest/v1`
- [ ] `src/deep_owl/data/birdeye.py` — async client z API key auth + rate limit (30/min free)
  - Endpoints: `/defi/token_overview`, `/defi/v3/token/holder`, `/defi/v3/token/list`
- [ ] Normalizer: mapping per-source response → wspólny `TokenSnapshot`
- [ ] DuckDB writer: upsert tokens, append snapshot time-series
- [ ] Tests integration z `aioresponses` (mock HTTP)
- [ ] Tests unit dla rate limiter + retry logic
- [ ] CLI: `deep-owl ingest --source dexscreener --token <addr>`
- [ ] Verify: 80%+ coverage, real API call manual test (1 token end-to-end)
- [ ] Update `CHANGELOG.md`, tag `v0.2.0`

**Done criteria:** Można uruchomić `deep-owl ingest` i widzieć row w `tokens` table + snapshot row. Test coverage ≥ 80%.

---

## Faza 3 — Backtesting engine

**Cel:** Candle aggregator z parent recorder, Strategy interface, 3 strategie, walk-forward runner.

- [ ] `src/deep_owl/modules/backtest/candles.py` — read parent zst, aggregate OHLCV 5/15m, write do DuckDB
  - Reuse parent `reader.py` pattern (check `D:/Crypto/Claude/reader.py` lub `analyzer/data/reader.py`)
- [ ] `src/deep_owl/modules/backtest/strategies/base.py` — Strategy Protocol
- [ ] `src/deep_owl/modules/backtest/strategies/breakout_consolidation.py` — Bollinger Squeeze + volume confirm
- [ ] `src/deep_owl/modules/backtest/strategies/volume_spike.py` — vol > 3x SMA20 + close > prev_high
- [ ] `src/deep_owl/modules/backtest/strategies/rsi_divergence.py` — RSI oversold + bullish divergence
- [ ] `src/deep_owl/modules/backtest/slippage.py` — linear model
- [ ] `src/deep_owl/modules/backtest/fees.py` — per-exchange table
- [ ] `src/deep_owl/modules/backtest/metrics.py` — Sharpe, Sortino, Calmar, max DD, win rate
- [ ] `src/deep_owl/modules/backtest/engine.py` — walk-forward runner
- [ ] HTML report generator (plotly + jinja2)
- [ ] Tests: golden fixtures (znane przypadki), shape checks
- [ ] CLI: `deep-owl backtest --strategy volume_spike --symbol BTCUSDT --days 30`
- [ ] Verify: end-to-end run na 30 dniach BTC/ETH/HYPE, HTML wygenerowany
- [ ] Update `CHANGELOG.md`, tag `v0.3.0`

**Done criteria:** Można uruchomić backtest z CLI, widzieć HTML report z metrics. Coverage ≥ 80%.

---

## Faza 4 — Module 1: Accumulation Detector

- [ ] `src/deep_owl/modules/accumulation.py` — main detector class
- [ ] Signal extractors (per sygnał z ARCHITECTURE.md)
- [ ] Weighted scoring + normalization
- [ ] Threshold + alert gating (cooldown per token 6h)
- [ ] Persist do `signals` table
- [ ] Wpięcie pollera (asyncio task co 60s)
- [ ] **Backtest sygnałów:** uruchom Module 1 na historical data (Faza 3 engine), sprawdź czy alerty BYŁY przed pumpem
- [ ] Tests: każdy sygnał z znanych przypadków
- [ ] CLI: `deep-owl detect --token <addr>`, `deep-owl run` (continuous mode)
- [ ] Update `CHANGELOG.md`, tag `v0.4.0`

**Done criteria:** Continuous mode runs, signals zapisywane, manual review pokazuje prawdziwe accumulation patterns.

---

## Faza 5 — Module 2: Fresh Projects Monitor

- [ ] `src/deep_owl/modules/fresh.py` — main monitor class
- [ ] `src/deep_owl/data/rugcheck.py` — RugCheck.xyz client (Solana)
- [ ] `src/deep_owl/data/goplus.py` — GoPlus Security client (EVM)
- [ ] Rugpull filter (Stage 0)
- [ ] Growth scoring (Stage 1+)
- [ ] Lifecycle stage transitions
- [ ] Handoff do Module 1 (token przechodzi do Stage 2+ z `growth_score > 60` → universe accumulation)
- [ ] Persist do `fresh_projects` table
- [ ] Tests: rugpull cases, growth scenarios
- [ ] CLI: `deep-owl fresh list`, `deep-owl fresh check <addr>`
- [ ] Update `CHANGELOG.md`, tag `v0.5.0`

**Done criteria:** Fresh discovery działa, lista promising projektów + rugpull filtered out.

---

## Faza 6 — Output: Telegram + Dashboard + Paper Trader

- [ ] `src/deep_owl/output/paper_trader.py` — simulated fill engine
- [ ] `src/deep_owl/output/telegram_bot.py` — bot + komendy
- [ ] `src/deep_owl/output/dashboard.py` — FastAPI app
- [ ] Templates HTML/HTMX dla 5 zakładek
- [ ] Wiring: signal → paper trade auto-open (configurable)
- [ ] Tests integration (full flow: poll → signal → paper trade → dashboard show)
- [ ] CLI: `deep-owl serve` (uruchamia bot + dashboard + worker)
- [ ] Manual demo z user
- [ ] Update `CHANGELOG.md`, tag `v0.6.0` / `v1.0.0` (jeśli ready dla daily use)

**Done criteria:** End-to-end demo: bot wykrył sygnał → Telegram alert przyszedł → dashboard pokazuje → paper trade otwarty → 24h later widzimy PnL.

---

## Reguły aktualizacji tego pliku

1. **Co sesję:** zaznaczaj ukończone checkboxes, dopisuj odkryte sub-taski (NIE bezpośrednie taski — wszystko musi się mieścić w fazie)
2. **Per fazę:** po zamknięciu fazy → update CHANGELOG + tag git
3. **Nie dodawaj fazy 7+ przed zamknięciem 6** (anti-scope-creep). Jeśli nowy duży pomysł → dyskusja z userem, decyzja czy to v2 czy refactor istniejącej fazy.
