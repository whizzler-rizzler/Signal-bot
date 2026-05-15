# Changelog

Wszystkie zmiany w projekcie. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [Semantic Versioning](https://semver.org/).

## [Unreleased]

(Praca w toku — kandyduje do następnego tagu)

## [0.1.4] — 2026-05-15 — Branch hygiene infra + project-specific tier/agent routing

User feedback: "czy zaimplementowałeś już zasady zarządzania gałęziami oraz tree z global rules? Czy są agenci tutaj wrzuceni i krytycy i rozmiary zmian S/M/L?"

Odpowiedź: NIE — implementuję teraz pełen checklist.

### Added — Branch management infrastructure
- `branches/_template.md` — template MANDATORY dla każdego nowego branch
- `branches/main.md` — metadata main branch
- `scripts/check_session_sync.py` — session start sync check (multi-branch awareness, stale detect)
- `scripts/branch_audit.py` — daily audit (>3 active warning, >5 mandatory cleanup)
- `scripts/pre_deploy_audit.py` — BLOCK gdy stale state lub uncommitted (override `--force --reason`)
- `scripts/hooks/pre-commit` — source-controlled pre-commit hook (branch metadata + hexagonal violations + secret scan)
- `scripts/install_git_hooks.ps1` — one-time installer (`.git/hooks/` not version-controlled)

### Added — CLAUDE.md upgrades (project-specific)
- **Doc currency check** protocol (session start KRYTYCZNE)
- **Tier S/M/L detection** z **project-specific examples** (engine threshold tweak = S, nowy CEX = L)
- **Anti-infinity rules** (max 2 iter safety backstop, stop-condition > count)
- **Agent routing matrix per hexagonal layer** — per-layer specific reviewers:
  - Engines: `python-reviewer` + `tdd-guide` (engine independence)
  - Connectors: `silent-failure-hunter` (reconnect/heartbeat) + `security-reviewer` (auth)
  - Processors: `python-reviewer` (numpy correctness)
  - Orchestrator: `silent-failure-hunter` (dropped task risk)
  - DB: `database-reviewer` (schema, partition, queries)
  - Output: `security-reviewer` (FastAPI binding 127.0.0.1)
- **Security krytyk scope** (TYLKO gdy auth/secret/network — pure compute SKIP)
- **Project-specific architecture invariants (grep tests)** — hexagonal violations BLOCK commit:
  - Engine NIE importuje connectors/db
  - Connector NIE importuje engines/processors
  - Processor NIE importuje connectors/db
- **Branch management section** z stale lifecycle (7d/14d/30d) + multi-worktree rules pointer

### Changed
- FILE_HYGIENE.md: dodano `branches/` reguły (metadata MANDATORY per non-main branch)

### Rationale
Przed v0.1.4 mieliśmy tylko skrót w CLAUDE.md ze wskazaniem na global rules. Teraz infrastruktura jest **project-local** — działa bez polegania na global rules loading. Pre-commit hook enforce hexagonal architecture w runtime — zapobiega architecture drift przez setki engines/connectors w przyszłych fazach.

## [0.1.3] — 2026-05-15 — Hexagonal architecture + 4 nowe MD docs

User feedback po v0.1.2: **"top of the top architektura, każdy silnik osobny plik, connectors osobno, processors osobno, parallelism max"** + lista 4 nowych dokumentów do przygotowania.

### Added
- **RESUME_INDEX.md** (NEW) — router wskazujący który dokument do czego (zacznij sesję tutaj)
- **RESEARCH.md** (NEW) — methodology, signal theory (Wyckoff, funding squeeze), walk-forward methodology, statistical significance, literature references
- **TECH_STACK.md** (NEW) — deep dive stack: Python 3.11+, asyncio + multiprocessing parallelism strategy, DuckDB columnar rationale, dependency table z uzasadnieniami
- **DATABASE.md** (NEW) — DB deep dive: pełen schema v3 (13 tabel), partitioning strategy (DuckDB + parquet cold tier), indexes, common query patterns, migrations, backup, performance tuning, skala estimates

### Changed
- **ARCHITECTURE.md MAJOR REWRITE** — hexagonal architecture (Cockburn 2005 ports & adapters):
  - 6 layers: connectors / processors / engines / orchestrator / parallelism / output
  - Każdy engine = osobny plik (Module 1 = 7 engines, Module 2 = 8 engines, Module 3 = 2 engines)
  - Każdy connector = osobny katalog per source (~25 plików)
  - Każdy processor per data type (numerical / timeseries / text / events)
  - Orchestrator decyduje parallelism (NIE engine)
  - Reguła żelaznej separacji: engines NIE rozmawiają z API/DB, connectors NIE liczą metryk, processors NIE I/O
- **DATA_SOURCES.md update** — separated per connector: ~20 odrębnych connectorów wymienionych z paths w kodzie
- **PHASES.md update** — re-faza pod hexagonal: Faza 2 dodaje engines layer setup, Faza 3a osobno per CEX connector pliki, Faza 4-5 osobne engines per signal/strategy
- **FILE_HYGIENE.md MAJOR UPDATE**:
  - Limit MD root: **8 → 12** (dodane: RESUME_INDEX, RESEARCH, TECH_STACK, DATABASE)
  - Dodana sekcja "Hexagonal architecture rules (Python skeleton)" z 8 żelaznymi regułami
  - Dodane code patterns ZAKAZANE: mega-engine >200 linii, engine który robi I/O, connector który liczy metryki, processor który rozmawia z API
  - Anti-bloat checklist: dodano engine independence test
- **CLAUDE.md update** — wspomina hexagonal architecture, link do RESUME_INDEX jako entry point
- **README.md update** — quick architectural overview (hexagonal layout) + dokumentacja table 12 plików

### Decisions
- Hexagonal architecture (Ports & Adapters pattern, Cockburn 2005) — żelazna separacja warstw
- Concurrency strategy: asyncio (I/O) + multiprocessing (CPU-bound engines)
- Engines NIE wpinalne automatycznie — orchestrator decyduje
- Każdy engine MUSI być uruchamialny SAM z mocked input (independence test)
- DuckDB hot tier (90 dni) + parquet cold tier (>90d archive)

### Out of scope
- Bonds, indexy, S&P 500 connectors — to był przykład hipotetyczny z poprzedniego chatu, NIE w naszym scope. Pure crypto only.

## [0.1.2] — 2026-05-15 — WebSocket-first + Module 3 (New Listings)

User feedback po v0.1.1 doprecyzował 3 fundamentalne kwestie skali:

### Changed
- **Universe scope:** pobieramy **WSZYSTKO** z 4 priorytetowych CEX (Binance/Bybit/OKX/Coinbase) bez aggressive cap filter — ~3000-4000 tokenów. Filter pipeline łagodny (tylko stablecoins/wrapped/dead exclude).
- **Tier classification:** rozszerzone z 3 na **4 tiery** (top 100 / 500 / 2000 / rest) — bo full universe wymaga tail handling
- **Data ingestion strategy:** **WebSocket-first** — 4 trwałe WS connections per CEX (Binance spot+futures, Bybit spot+linear, OKX, Coinbase) jako PRIMARY live data za $0
- **REST API role:** zmienione z primary na **backfill + sanity reconcile** (co 30 min losowe próbki cross-validate vs WS)
- **Phase plan:** Faza 3 rozdzielona na **3a (WebSocket)** + **3b (REST backfill)**
- **Faza 2 zakres:** dodano CEX symbols daily snapshot + diff detection (foundation dla Module 3)
- **Faza 5 zakres:** dodano Module 3 New Listings Monitor (engine + filter logic + RSS parser)
- **Faza 6 zakres:** dashboard rozszerzony z 5 do **7 zakładek** (+ New Listings + Filter Sets UI)

### Added
- **Module 3 — New Listings Monitor** — CEX listing detector z user-configurable filter sets (powraca z out-of-scope w innym kontekście — CEX-only, NIE DEX)
- User-defined filter sets (config.yaml defaults + dashboard UI runtime overrides) z atrybutami: market_cap range, volume range, listing count, age hours, quote assets, perpetual req, meme keywords include/exclude, tier_max, alert_on_match
- DB tables: `cex_symbols_snapshot`, `new_listings`, `new_listing_filters`, `ws_status`
- Data models: `Kline`, `FundingRate`, `OpenInterest`, `Liquidation`, `NewListing`, `FilterSet`
- WebSocket lifecycle docs: reconnect (exp backoff), heartbeat (ping/pong), replay buffer
- WS frame normalizer per CEX → common models
- In-memory buffer (asyncio.Queue) + bulk INSERT DuckDB co 30s lub 1000 events
- Cross-pollination M3 → M1: token w aktywnym new_listings boostuje social_velocity weight
- Binance Announcements RSS parser (24-48h forward notice na upcoming listings)
- `requirements.txt`: `websockets>=12,<14` dependency

### Decisions
- Universe: wszystko z 4 priorytetowych CEX (~3-4k), NIE top 5000 z CMC
- Data primary: WebSocket (free, unlimited), REST tylko backfill+sanity
- Module count: **3** (re-added New Listings — różny scope niż wcześniej fresh DEX)
- Filter sets: config + UI override (najbardziej flexible)
- Coinbase: spot only (brak public futures API)
- Tier rozszerzone na 4 (był 3) — full universe wymaga tail tier

### Cost
**Faza 0-6: $0** — WebSocket starczy do pełnego coverage 4000 tokenów. CoinGecko free 30/min + CMC free 333/d wystarczą na daily universe rebuild.

## [0.1.1] — 2026-05-15 — DOCX → MD swap

Long-form architecture deck przeniesiony z DOCX (binarny, edycja w Wordzie) do pojedynczego MD pliku.

### Added
- `docs/deep_owl_v1.md` — long-form deck w markdown (12 sekcji, ~5000 słów, ten sam content co poprzedni DOCX v0.1.0)

### Removed
- `docs/deep_owl_v1.docx` — DOCX v0.0.0 (DEX-first deprecated content)
- `docs/deep_owl_v0_1_0.docx` — DOCX v0.1.0 fallback
- `scripts/generate_docx.js` — generator JS (już niepotrzebny, MD edytujemy ręcznie)

### Changed
- Cross-references w CLAUDE.md, README.md, PHASES.md, FILE_HYGIENE.md zaktualizowane: DOCX → MD
- FILE_HYGIENE.md hard limity: pole "long-form deck" zmienione z DOCX na MD

### Rationale
- MD czyta się lepiej (plain text w terminal/editor)
- MD diff'uje się w PR (czytelne git diff)
- Bez Word lock issues (file locked = nie można nadpisać)
- Edycja w VS Code zamiast Worda
- Jeden mniej format/tool w stacku

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
