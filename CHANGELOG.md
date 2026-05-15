# Changelog

Wszystkie zmiany w projekcie. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [Semantic Versioning](https://semver.org/).

## [Unreleased]

(Praca w toku — kandyduje do następnego tagu)

## [0.1.0] — 2026-05-15 — PIVOT: Big Caps CEX-First

User feedback po v0.0.0 wskazał krytyczny błąd kierunku: skupiliśmy się na low caps / fresh DEX projects, ale TOP 1 PRIORITY to **big caps na CEX-ach z stażem (top ~5000 z CMC/CoinGecko po filtrowaniu)**. DEX/fresh całkowicie WYWALONE z scope.

### Changed
- **Architektura:** 2 moduły zamiast 3 (Module 1 Accumulation + Module 2 Backtest)
- **Universe:** ~5000 realnych big cap tokenów (filter z 10k+ CoinMarketCap/CoinGecko) zamiast top 500 trending DEX
- **Data primary:** CEX REST API (Binance/Bybit/OKX/Coinbase klines + funding + OI) zamiast Dexscreener/Birdeye
- **Sygnały Module 1:** dodano funding rate skew, OI buildup, cross-exchange divergence, liquidation imbalance (CEX-specific signals)
- **Tier-aware scoring:** Tier 1 (top 100) próg 70+, Tier 2 (top 500) 65+, Tier 3 (top 5000) 60+
- **Phase plan:** odwrócony — Universe Builder → CEX REST → Backtest → Module 1 → Output
- **Backtesting universe:** top 100 → top 500 → top 5000 (CEX historical klines, Binance ma do 2017)
- DOCX regenerated dla nowej zawartości

### Removed
- ❌ Module "Fresh Projects Monitor" — całkowicie out of scope
- ❌ Dexscreener API integration (planowana w fazie 2)
- ❌ Birdeye API integration (planowana w fazie 2)
- ❌ RugCheck.xyz integration (planowana w fazie 5)
- ❌ GoPlus Security integration (planowana w fazie 5)
- ❌ Lifecycle stages 0-4 dla fresh tokens
- ❌ Rugpull filter logic
- ❌ Tabela `fresh_projects` z DB schema

### Added
- Universe Builder z CoinMarketCap + CoinGecko (Faza 2)
- CEX REST adapters: Binance, Bybit, OKX, Coinbase (Faza 3)
- Tabele DB: `token_listings`, `klines_5m`, `klines_15m`, `funding_history`, `open_interest`
- Funding squeeze strategy template (specyficzne dla perpetual futures big caps)
- Cross-validation Module 1 na historical data (sprawdzenie czy alerty BYŁY przed historycznymi breakouts)
- Skala estimates: ~25GB DuckDB/rok, partitioning by month, archive >90 dni do parquet

## [0.0.0] — 2026-05-15

Faza 0 — Plan-as-docs + skeleton.

### Added
- Skeleton repo struktura (src/deep_owl, tests, docs, scripts)
- 8 MD docs: CLAUDE.md, README.md, ARCHITECTURE.md, PHASES.md, DATA_SOURCES.md, GIT_WORKFLOW.md, FILE_HYGIENE.md, CHANGELOG.md
- 20-stronicowy DOCX pitch v1 (DEX-first scope — DEPRECATED przez v0.1.0 pivot)
- Pydantic v2 + DuckDB + asyncio tech stack zdefiniowany
- pyproject.toml + requirements.txt + requirements-dev.txt
- .gitignore + .env.example
- Hard izolacja od parent market_maker context (own CLAUDE.md)

### Decisions (v0.0.0 — superseded przez v0.1.0)
- Data sources: Hybrid (DEX-first via Dexscreener/Birdeye agregat + CEX reuse parent recorder) ❌ ZMIENIONE
- Chains: Multi-chain agregat (200+ via Dexscreener, Solana priority via Birdeye) ❌ ZMIENIONE
- 3 modules (Accumulation + Fresh + Backtest) ❌ ZMIENIONE NA 2
- Output: Sygnały + paper trading (no real wallet) ✅ NIEZMIENIONE
- Repo: Standalone (`git init` w Breakout_signals, własny CLAUDE.md) ✅ NIEZMIENIONE
- Storage: DuckDB (embedded, columnar, 1-file backup) ✅ NIEZMIENIONE
- Language: Python 3.11+ ✅ NIEZMIENIONE

---

## Reguły aktualizacji

1. **Per zamkniętą fazę:** dodaj sekcję `## [0.{phase}.0] — YYYY-MM-DD` z `### Added / Changed / Fixed / Removed`
2. **Per hotfix:** `## [0.{phase}.{patch}] — YYYY-MM-DD`
3. **W Unreleased:** dopisuj w trakcie pracy, przenoś do nowej sekcji przy tagu
4. **Format wpisu:** 1-linijka per change (link do PR jeśli istnieje)
5. **NIE duplikuj** szczegółów z commit messages — tylko user-facing changes
