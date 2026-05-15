# File Hygiene — Deep Owl

> Meta-zasady chroniące przed file/docs sprawl. Bez nich projekt rozsypie się w 50+ pliku MD i 200 helperów po 3 miesiącach.

## Reguła podstawowa

> **Każdy nowy plik MUSI mieć określoną rolę.** Brak roli = brak pliku.

## Hard limity

| Lokalizacja | Limit | Action po przekroczeniu |
|---|---|---|
| MD w root | **max 12** (te które są — patrz tabela poniżej) | Audit + konsolidacja |
| ADR w `docs/decisions/` | **max 5 w fazach 0-6** | Sygnał over-engineering — review wszystkich |
| Long-form deck w `docs/` | **1 plik** (`deep_owl_v1.md`) | Redaguj redakcyjnie nie wersjonuj |
| **Connectors per source** | **1 katalog** w `src/deep_owl/connectors/` | Każdy CEX/source = osobny katalog |
| **Engines** | każdy w **OSOBNYM pliku** w `src/deep_owl/engines/` | NIE konsoliduj engines w jednym pliku |
| **Processors** | każdy w **OSOBNYM pliku** w `src/deep_owl/processors/` | Per data type, nie per use case |
| Lines per Python file | **max 400** (max 800 absolute) | Split |
| Functions per file | **max 15** | Split |
| Function length | **max 50 linii** | Refactor — extract helpers |

## MD files — dozwolone (te 12)

| Plik | Rola | Update freq | Owner |
|---|---|---|---|
| `README.md` | Quick start, 1 ekran | Rzadko | manual |
| `CLAUDE.md` | Project context dla Claude | Per major architecture change | manual |
| `RESUME_INDEX.md` | Router — wskazuje który dokument do czego | Per nowy MD | manual |
| `ARCHITECTURE.md` | High-level architecture (hexagonal: connectors/processors/engines) | Per fazę | manual |
| `TECH_STACK.md` | Deep dive stack (Python, asyncio, parallelism, libs choice) | Rzadko | manual |
| `DATABASE.md` | DB deep dive (schema, partitioning, queries, migrations) | Per schema change | manual |
| `DATA_SOURCES.md` | API matrix (per connector) | Per nowy connector | manual |
| `RESEARCH.md` | Methodology, signal theory, walk-forward, literature | Rzadko | manual |
| `PHASES.md` | Progress per faza, checkboxes | Co sesję | manual / claude-update |
| `GIT_WORKFLOW.md` | Branche, commits, PR | Rzadko | manual |
| `FILE_HYGIENE.md` | Ten plik — meta-rules | Rzadko | manual |
| `CHANGELOG.md` | 1 linijka per tag | Per fazę | manual |

**Plus dozwolone:**
- `docs/decisions/ADR-NNNN-{slug}.md` — Architecture Decision Records (max 5)
- `docs/deep_owl_v1.md` — long-form architecture deck (1 plik, redaguj redakcyjnie)

## MD files — ZAKAZANE

- ❌ `notes.md`, `notes/*.md` — używaj GitHub Issues
- ❌ `todo.md`, `TODO.md`, `tasks.md` — używaj `PHASES.md` checkboxes
- ❌ `scratch.md`, `wip.md`, `playground.md` — pisz w branch + PR description
- ❌ `RESUME_PROMPT.md`, `SESSION_LOG.md`, `HANDOFF.md` — sesja CLAUDE Code memory + `PHASES.md` + `RESUME_INDEX.md` wystarczają
- ❌ `FUNCTIONS_HEALTH.md`, `ITERATION_LOG.md` — wzorce parent market_maker, NIE replikujemy w solo dev
- ❌ Duplicaty (`README.md` + `README_v2.md` + `README_old.md` — DELETE old)
- ❌ Per-module README w `src/...` — single ARCHITECTURE.md jest source of truth

**Generalna zasada:** zanim utworzysz nowy MD, zapytaj się: "Czy ten content może żyć w istniejącym pliku (sekcja, expansion) lub w GitHub Issue?"

## Hexagonal architecture rules (Python skeleton)

**ŻELAZNA SEPARACJA:**

```
src/deep_owl/
├── connectors/          # I/O adapters (per source) — TYLKO I/O, NIE logika
├── processors/          # Data transformers per data type — TYLKO transform
├── engines/             # Computational engines — pure logic, NIEZALEŻNE
├── orchestrator/        # Pipeline executors — combine engines
├── data_models/         # Pydantic models per layer
├── core/                # Foundation (db, config, logger, types)
├── parallelism/         # Concurrency primitives
└── output/              # Telegram, dashboard, paper trader
```

**Reguły żelaznej separacji:**

1. **Connector NIE liczy nic** — tylko pobiera surowe dane i normalizuje do `data_models/normalized.py`. Zero biznesowej logiki.
2. **Processor NIE rozmawia z API** — przyjmuje normalized data, transformuje (rolling stats, pivot, sentiment extract). Zero I/O.
3. **Engine NIE rozmawia z API ani DB bezpośrednio** — przyjmuje processed data, zwraca `Signal`. Pure compute.
4. **Engine MUSI być niezależny** — uruchomiony sam (z mocked input) działa. NIE wpinaj engines automatycznie do pipeline'u.
5. **Orchestrator decyduje** kiedy uruchomić jaki engine, jak je równolegle wykonać, jak agregować results.
6. **Każdy engine = osobny plik.** ZAKAZ konsolidacji "Module 1 = jeden duży plik". Module 1 = orchestrator + 7 engines (każdy w osobnym pliku).
7. **Każdy connector = osobny katalog z osobnymi plikami per stream type** (binance/ws_spot.py, binance/ws_futures.py, binance/rest_spot.py).
8. **Każdy processor = osobny plik per data type** (numerical/ohlcv_aggregator.py, text/sentiment_extractor.py).

## Code files — zakazane patterns

- ❌ `utils.py` w root pakietu (za szerokie — split do `utils/strings.py`, `utils/time.py`)
- ❌ `helpers.py` (jw)
- ❌ `common.py` (jw — nazwij konkretnie)
- ❌ `__init__.py` z logiką (tylko re-exports max — better: explicit imports)
- ❌ Mega-modules > 800 linii (split)
- ❌ **Mega-engine** > 200 linii (split na sub-engines)
- ❌ Engine który robi I/O (network, DB) — to violation hexagonal
- ❌ Connector który liczy biznesowe metryki — to violation
- ❌ Processor który rozmawia z API — to violation
- ❌ Test files które testują > 1 module
- ❌ Compiled artifacts w repo (`.pyc`, `__pycache__/`, `*.egg-info/`)

## Redakcja > append-only

**Anti-pattern:** dodawanie sekcji "Update 2026-05-15" do MD i nigdy nie usuwanie starych.

**Pattern:** stare info → DELETE lub konsolidacja. Jeśli HISTORICALLY istotne → sekcja "Historical context" na dole.

```markdown
# Złe (append-only):
## Module 1 design
[stara wersja]

## Module 1 design v2 (2026-05-15)
[nowa wersja — ale stara nadal tu jest]

# Dobre (redakcja):
## Module 1 design
[aktualna wersja, single source of truth]
```

## Session end protocol

Każda sesja KOŃCZY się jednym z:

1. **Kod dotknięty:** commit + push + update `PHASES.md` jeśli checkbox flipped
2. **Tylko exploration:** `git status` clean, nie commitujemy nic
3. **Faza zamknięta:** commit + tag `v0.{phase}.0` + update `CHANGELOG.md`

**Anti-drift check (co sesję):**

```powershell
# 1. Czy nie ma orphan files?
git status

# 2. Czy MD count w limicie?
ls *.md | measure | select Count

# 3. Czy CLAUDE.md nadal aktualny?
# Read CLAUDE.md → confirm że "Status: Faza X" matches reality

# 4. Czy są niezamknięte branches > 7 dni?
git branch -v

# 5. Engines/connectors NIE rosną nieograniczenie?
ls src/deep_owl/engines/*.py | measure
ls src/deep_owl/connectors/**/*.py | measure
```

## Dependency hygiene

- Pin major versions w `requirements.txt` (`pydantic>=2.6,<3`)
- Bump deliberately, nigdy `pip install --upgrade` blindly
- `requirements-dev.txt` zawiera `-r requirements.txt` na top (nie duplikuj)
- Niepotrzebny dep → remove (audit raz w fazie)

## Config files — gdzie co

| Co | Gdzie | Commit? |
|---|---|---|
| `pyproject.toml` | root | YES |
| `requirements*.txt` | root | YES |
| `.gitignore` | root | YES |
| `.env.example` | root | YES (template) |
| `.env` | root | **NO** (gitignored) |
| `config.example.yaml` | root | YES |
| `config.yaml` | root | NO (gitignored) |
| `.pre-commit-config.yaml` | root | YES |
| `.python-version` | root | YES |

## Anti-bloat checklist (co fazę)

- [ ] `git ls-files *.md | wc -l` — czy w limicie (≤ 12 root + ≤ 5 ADR + 1 long-form)?
- [ ] `find src/deep_owl/engines -name "*.py" | wc -l` — engines count (każdy = osobny plik)
- [ ] `find src/ -name "*.py" | xargs wc -l | tail -1` — total LOC trend (>30% growth/fazę → audit)
- [ ] `pip list | wc -l` — total deps drift check
- [ ] `git log --oneline | wc -l` — commit count per fazę
- [ ] Stare orphan files (`git status -u`)
- [ ] Engine independence test: każdy engine w `engines/` musi mieć unit test który tworzy go z mocked input i sprawdza output (NIE zależny od DB ani API)

## Rule overrides

Jeśli REGUŁA Z TEGO PLIKU staje na drodze sensownej pracy:

1. **STOP** — nie łam reguły blindly
2. Uzasadnij w 1 zdaniu (commit message lub PR description)
3. Jeśli reguła zawodzi systemowo → update tego pliku (commit `docs: update FILE_HYGIENE rule X — Y rationale`)

**Anti-pattern:** ciche łamanie reguł bez updateu. Albo reguła obowiązuje (i ją updateujemy gdy nie pasuje), albo nie obowiązuje (i ją usuwamy).
