# CLAUDE.md — Deep Owl (Breakout Signals)

> **Project:** Deep Owl · **Status:** Faza 0 (skeleton + planning docs) · **HEAD:** v0.1.4
>
> **Ważne:** Ten projekt jest CAŁKOWICIE ODRĘBNY od parent `D:\Crypto\Claude` (market_maker). **NIE** loaduj parent `D:\Crypto\Claude\CLAUDE.md` jako kontekst. Pracujemy tylko w obrębie `D:\Crypto\Claude\Breakout_signals\`.
>
> **Architektura:** **Hexagonal** (connectors / processors / engines / orchestrator / parallelism). Każdy engine = osobny plik. Top of the top separation. Patrz [ARCHITECTURE.md](ARCHITECTURE.md) i [FILE_HYGIENE.md](FILE_HYGIENE.md) — żelazne reguły.

---

## 🚦 Doc currency check (session start) — KRYTYCZNE

Gdy zaczynasz sesję:

```powershell
# 1. Sprawdz aktualny stan
git log --oneline | Select-Object -First 5
git rev-parse HEAD
git tag -l | Select-Object -Last 1

# 2. Cross-check z RESUME_INDEX.md banner ("Snapshot: vX.Y.Z")
# Jesli mismatch → repo state jest ground truth, NIE banner
```

**Stop-condition:** Nie zaczynaj implementacji jeśli discrepancy między pasted prompt a repo HEAD nieuzgodniona z user.

**Per session start:**
1. `python scripts/check_session_sync.py` (sync z innymi branches jeśli >1 active)
2. Read `PHASES.md` → current focus, otwarte taski
3. Read `CHANGELOG.md` → ostatni release tag
4. Verify: `git status --short` (no orphan files)

---

## 🌳 Branch management — multi-worktree rules

> Jeśli active branches > 2 → loadujemy parent `~/.claude/rules/common/multi-worktree.md`. Aktualnie solo dev na main = OK bez ceremonii.

**Hard rules:**

- **Branch metadata MANDATORY:** każdy branch (poza `main`) MUSI mieć `branches/<branch-name>.md` (template w `branches/_template.md`)
- **Daily audit gdy >3 active:** `python scripts/branch_audit.py`
- **Session start gdy >1 active:** `python scripts/check_session_sync.py`
- **Pre-deploy:** `python scripts/pre_deploy_audit.py` (BLOCK gdy stale)
- **Pre-commit hook:** `.git/hooks/pre-commit` enforcuje branch metadata + hexagonal violations

**Stale branch lifecycle:**

| Wiek (od last commit) | Status | Action |
|---|---|---|
| 0-7 dni | active | nic |
| 7-14 dni | stale candidate | warning "merge or document why parked" |
| 14-30 dni | archive candidate | `git branch -m <name> archive/<name>` |
| 30+ dni | delete candidate | `git branch -D <name>` (po backup tarball jeśli unique work) |

**Install hooks:**
```powershell
.\scripts\install_git_hooks.ps1
```

---

## 🎯 TIER DETECTION (stop-condition driven)

Skala zmiany determinuje workflow ceremoniał. Auto-detect; override `TIER:S/M/L` w prompt.

| Tier | Scope | Workflow | STOP condition |
|---|---|---|---|
| **S** | <20 linii, 1 plik, typo/trivial/single-engine threshold tweak | READ+GREP → EDIT → `pytest -x` | testy pass → **KONIEC** (zero krytyków) |
| **M** | 20-100 linii, 2-5 plików, 1 nowy engine, 1 nowy connector | Analityk → 1× Krytyk Poprawności → EDIT → 1× Weryfikator | Weryfikator APPROVE → **KONIEC** |
| **L** | 100+ linii / nowa warstwa / DB schema change / nowy moduł | Analityk → Architekt → 3× Krytyk Opus parallel → EDIT → 2× Weryfikator voting | 2/2 APPROVE → **KONIEC** |

**Przy niepewności → NIŻSZY tier.** Anti-overengineering.

**Project-specific tier examples:**

| Zmiana | Tier | Rationale |
|---|---|---|
| Tweak wagi engine w config.yaml | **S** | <5 linii, 1 plik |
| Threshold change w `tier_classifier_engine.py` | **S** | <20 linii, 1 plik, no infra |
| Dodanie nowego engine (np. nowy sygnał Module 1) | **M** | nowy plik + test + register w orchestrator |
| Dodanie nowego CEX connector (jeden plik ws_spot.py) | **M** | 1 katalog + parsers + register |
| Dodanie nowego CEX (Binance + Bybit + OKX + Coinbase + ...) | **L** | nowy katalog + 6 plików + DB schema cross-check |
| Refactor hexagonal layer | **L** | architecture-level, multi-file |
| DB schema migration (nowa tabela + indexes + queries) | **L** | DATABASE.md update + migration script + tests |

---

## ⛔ ANTI-INFINITY (max 2 iter safety backstop)

1. **Tier S = ZERO krytyków/weryfikatorów.** Trivial → Edit + pytest + gotowe.
2. **Krytyk sprawdza `docs/decisions/` + `CHANGELOG.md` PRZED iteracją.** Już zatwierdzone → NIE re-eskaluje.
3. **Max 2 iteracje per faza.** Po 2 odrzutach → eskalacja do user, NIE pętla.
4. **Stop-condition > count.** Od razu pass → 0 rund. Zero "rund dla formy".
5. **Pytest:** `pytest -x` (first-fail) dev, `pytest tests/` (full) **1× przed commit/tag**.

**Iteration loop anti-pattern:** iteracja >2 na tym samym problemie BEZ zmiany approach = STOP, eskalacja.

---

## 🔀 Agent routing matrix (per hexagonal layer)

Per layer / scope różny reviewer. Zero invokacji bez warunku — koszt subagent ≈ 5-10 min.

### Engines layer (pure compute)

| Trigger | Agent | Rationale |
|---|---|---|
| Nowy engine (compute logic) | `python-reviewer` | Generic Python idioms, type safety, sigmoid normalization correctness |
| Cross-validation Module 1 (Faza 5 KRYTYCZNE) | `tdd-guide` + `python-reviewer` | TDD pre-deploy + statistical correctness review |
| Performance issue w engine compute | `performance-optimizer` | Vectorize numpy, avoid pandas hot path |
| Engine niezależnie testowalny? | `tdd-guide` | Engine independence test (no I/O dependency) |

### Connectors layer (I/O only)

| Trigger | Agent | Rationale |
|---|---|---|
| Nowy CEX WS connector | `python-reviewer` + `silent-failure-hunter` | Async patterns + reconnect/heartbeat silent fail risk |
| Reconnect logic / replay buffer | `silent-failure-hunter` | Critical: orphan reconnect = silent data loss |
| Rate limit handling | `python-reviewer` | tenacity retry patterns |
| Auth/secret handling (CMC API key, Telegram token) | `security-reviewer` + `krytyk-bezpieczenstwa` | RAZEM (parallel, 1 message) — secret leak = critical |

### Processors layer (pure transform)

| Trigger | Agent | Rationale |
|---|---|---|
| Numerical processor (volume profiler, OHLCV agg) | `python-reviewer` | Numpy vectorization correctness |
| Text processor (RSS parser, classifier) | `python-reviewer` | Regex/string handling edge cases |
| Event processor (new listing extractor) | `silent-failure-hunter` | Diff edge cases (renamed symbol = false positive new listing) |

### Orchestrator + Parallelism

| Trigger | Agent | Rationale |
|---|---|---|
| Module orchestrator (combines engines) | `python-reviewer` + `silent-failure-hunter` | Async patterns + dropped task silent fail |
| ProcessPool / asyncio TaskGroup | `python-reviewer` + `performance-optimizer` | Concurrency correctness + bottleneck check |
| Stream multiplexer (WS) | `silent-failure-hunter` | Backpressure + queue overflow silent loss |

### DB layer

| Trigger | Agent | Rationale |
|---|---|---|
| Schema change (new table, index) | `database-reviewer` | Schema design, partition strategy, query patterns |
| Migration script | `database-reviewer` + `tdd-guide` | Idempotent + version bump + rollback plan |
| Bulk INSERT pipeline | `performance-optimizer` | Arrow zero-copy, batch size tuning |

### Output layer

| Trigger | Agent | Rationale |
|---|---|---|
| Telegram bot komendy | `python-reviewer` | Async patterns + rate limit |
| FastAPI dashboard routes | `python-reviewer` + `security-reviewer` | Bind 127.0.0.1 only, no auth bypass |
| Paper trader (sim fills) | `python-reviewer` + `tdd-guide` | Test coverage golden fixtures |

### Cross-cutting

| Trigger | Agent |
|---|---|
| Cleanup po fixie (dead imports, style) | `refactor-cleaner` |
| Update PHASES/CHANGELOG po zamknięciu fazy | `doc-updater` |
| Big architecture change (Tier L) | `architect` + `code-architect` |
| `/harness-audit` (>3 iter krytykow z tego samego powodu) | ad-hoc trigger |

**HARD RULES:**
- Hackathon agenty NIE ZASTĘPUJĄ Polish krytyków — UZUPEŁNIENIE punktowe
- Tier S → ZERO agentów (skala za mała, waste)
- Tier M → routing oszczędnie (1-2 agentów)
- Tier L → routing pełen (3 krytyków + 2 weryfikatorów)
- Multiple agents → spawn **równolegle** w 1 message (multiple Agent tool calls)
- Explicit `model: "opus"` dla krytyków/weryfikatorów

---

## 🛡️ Security krytyk: TYLKO gdy scope dotyka

Patrz `~/.claude/rules/security-scope.md` — dla Deep Owl konkretnie:

- ✅ Auth/secret handling: CMC API key, Telegram bot token, CoinGecko Pro key
- ✅ Telegram bot WebHook (Faza 6) — public surface
- ✅ FastAPI dashboard binding (MUSI być 127.0.0.1, nie 0.0.0.0)
- ✅ Bulk INSERT z user-provided data (filter sets z dashboard UI — SQL injection risk)
- ❌ Pure compute engine — SKIP
- ❌ Internal refactor warstw — SKIP
- ❌ Documentation only — SKIP

---

## 🔒 Project-specific architecture invariants (grep tests)

**Pre-commit hook + manual check** — hexagonal violations BLOCK commit.

```bash
# Engine import violations (engine NIE rozmawia z connectors ani DB)
grep -rn "from deep_owl.connectors" src/deep_owl/engines/ && exit 1
grep -rn "from deep_owl.core.db" src/deep_owl/engines/ && exit 1
grep -rn "import duckdb\|import aiohttp\|import websockets" src/deep_owl/engines/ && exit 1

# Connector import violations (connector NIE liczy biznesowych metryk)
grep -rn "from deep_owl.engines" src/deep_owl/connectors/ && exit 1
grep -rn "from deep_owl.processors" src/deep_owl/connectors/ && exit 1

# Processor import violations (processor NIE rozmawia z API/DB)
grep -rn "from deep_owl.connectors" src/deep_owl/processors/ && exit 1
grep -rn "import aiohttp\|import websockets\|import duckdb" src/deep_owl/processors/ && exit 1

# Engine independence (każdy engine MUSI być testowalny SAM)
# Test: import każdego engine z mocked input nie powinien wymagać DB/API
```

**Hexagonal violation discovered → STOP, fix przed continuation.** Nie commitujemy violations nawet jeśli "działa".

---

## Projekt — TL;DR

**Deep Owl** — bot do wykrywania sygnałów breakout NA BIG CAPS. Full coverage **wszystkiego co listed na min 1 z 4 priorytetowych CEX** (Binance/Bybit/OKX/Coinbase) = ~3000-4000 tokenów bez aggressive filter cap.

**3 moduły core:** Module 1 Accumulation Detector + Module 2 Backtesting + Module 3 New Listings Monitor.

**Data ingestion: WebSocket-first.** ~13-17 trwałych WS connections za $0, bez rate limitów.

**Output:** Telegram alerts + Web dashboard (FastAPI :8001) + paper trading (no real wallet).

## Build & Run

```powershell
cd D:\Crypto\Claude\Breakout_signals
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env

# Install git hooks (one-time)
.\scripts\install_git_hooks.ps1

# Tests
pytest tests/ -q
ruff check src/ tests/
mypy src/deep_owl/

# CLI (od fazy 1+)
python -m deep_owl.cli --help
```

## Style kodu

- Python 3.11+, type hints **wszędzie** (mypy strict)
- Logging przez `structlog` (JSON output), nigdy `print()`
- Pydantic v2 dla configs i models
- Immutability (frozen dataclass / nowe instancje)
- Async wszędzie I/O — synchronous tylko pure compute
- WS adapter MUSI mieć: reconnect (exp backoff), heartbeat, replay buffer
- REST adapter MUSI mieć: tenacity retry + per-endpoint quota tracking

## Bezpieczeństwo

- **NIGDY** nie commituj `.env`, API keys
- Dashboard MUSI bindować `127.0.0.1` (NIE 0.0.0.0)
- Paper trading **nigdy** nie tknie real wallet

## Linki — zacznij stąd

1. **[RESUME_INDEX.md](RESUME_INDEX.md)** — router (zacznij sesję tutaj)
2. **[PHASES.md](PHASES.md)** — gdzie jesteśmy, co dalej
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — hexagonal architecture (6 layers)
4. **[TECH_STACK.md](TECH_STACK.md)** — stack + parallelism
5. **[DATABASE.md](DATABASE.md)** — DB schema + queries
6. **[DATA_SOURCES.md](DATA_SOURCES.md)** — ~25 connectors per source
7. **[RESEARCH.md](RESEARCH.md)** — methodology, signal theory
8. **[GIT_WORKFLOW.md](GIT_WORKFLOW.md)** — branche, commits, PR
9. **[FILE_HYGIENE.md](FILE_HYGIENE.md)** — anti-sprawl + hexagonal rules
10. **[CHANGELOG.md](CHANGELOG.md)** — per-tag history
11. **[docs/deep_owl_v1.md](docs/deep_owl_v1.md)** — long-form deck (14 sekcji)

## Co NIE jest częścią projektu

- Real wallet / private keys / on-chain transactions
- DEX adapters (Dexscreener, Birdeye, Pumpfun, Raydium, Jupiter)
- Fresh DEX projects monitor (RugCheck, GoPlus)
- Per-chain native RPC (Solana web3.py, Ethereum eth_call)
- Mobile app, multi-user SaaS
- AWS deploy w fazach 0-6 (lokalne dev)
- Powielanie funkcjonalności parent market_maker
