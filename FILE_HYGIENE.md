# File Hygiene — Deep Owl

> Meta-zasady chroniące przed file/docs sprawl. Bez nich projekt rozsypie się w 50+ pliku MD i 200 helperów po 3 miesiącach.

## Reguła podstawowa

> **Każdy nowy plik MUSI mieć określoną rolę.** Brak roli = brak pliku.

## Hard limity

| Lokalizacja | Limit | Action po przekroczeniu |
|---|---|---|
| MD w root | **max 8** (te które są — patrz CLAUDE.md) | Audit + konsolidacja |
| ADR w `docs/decisions/` | **max 5 w fazach 0-6** | Sygnał over-engineering — review wszystkich |
| Python modules w `src/deep_owl/` (excluding subpackages) | **max 6 top-level** | Wymuszony refactor do podpakietów |
| Lines per Python file | **max 400** (max 800 absolute) | Split |
| Functions per file | **max 15** | Split |
| Function length | **max 50 linii** | Refactor — extract helpers |

## MD files — dozwolone (te 8)

| Plik | Rola | Update freq | Owner |
|---|---|---|---|
| `README.md` | Quick start, 1 ekran | Rzadko | manual |
| `CLAUDE.md` | Project context dla Claude | Per major architecture change | manual |
| `ARCHITECTURE.md` | Single source of truth | Per fazę | manual |
| `PHASES.md` | Progress per faza, checkboxes | Co sesję | manual / claude-update |
| `DATA_SOURCES.md` | API matrix | Per nowy adapter | manual |
| `GIT_WORKFLOW.md` | Branche, commits, PR | Rzadko (przy zmianie polityki) | manual |
| `FILE_HYGIENE.md` | Ten plik — meta-rules | Rzadko | manual |
| `CHANGELOG.md` | 1 linijka per tag | Per fazę | manual |

**Plus dozwolone:**
- `docs/decisions/ADR-NNNN-{slug}.md` — Architecture Decision Records (max 5)
- `docs/deep_owl_v1.docx` — snapshot 20-stronicowego pitchu (tylko ten 1 plik DOCX)

## MD files — ZAKAZANE

- ❌ `notes.md`, `notes/*.md` — używaj GitHub Issues
- ❌ `todo.md`, `TODO.md`, `tasks.md` — używaj `PHASES.md` checkboxes
- ❌ `scratch.md`, `wip.md`, `playground.md` — pisz w branch + PR description
- ❌ `RESUME_PROMPT.md`, `SESSION_LOG.md`, `HANDOFF.md` — sesja CLAUDE Code memory + `PHASES.md` wystarcza
- ❌ `FUNCTIONS_HEALTH.md`, `ITERATION_LOG.md` — to wzorce parent market_maker, NIE replikujemy w solo dev
- ❌ Duplicaty (`README.md` + `README_v2.md` + `README_old.md` — DELETE old)

**Generalna zasada:** zanim utworzysz nowy MD, zapytaj się: "Czy ten content może żyć w istniejącym plikiem (sekcja, expansion) lub w GitHub Issue?"

## Code files — zakazane patterns

- ❌ `utils.py` w root pakietu (za szerokie — split do `utils/strings.py`, `utils/time.py`, etc.)
- ❌ `helpers.py` (jw)
- ❌ `common.py` (jw — nazwij konkretnie)
- ❌ `__init__.py` z logiką (tylko re-exports max — better: explicit imports)
- ❌ Mega-modules > 800 linii (split)
- ❌ Test files które testują > 1 module (split — `test_dexscreener.py` testuje TYLKO dexscreener)
- ❌ Compiled artifacts w repo (`.pyc`, `__pycache__/`, `*.egg-info/`)

## Redakcja > append-only

**Anti-pattern:** dodawanie sekcji "Update 2026-05-15" do MD i nigdy nie usuwanie starych.

**Pattern:** stare info → DELETE lub konsolidacja. Jeśli HISTORICALLY istotne → sekcja "Historical context" na dole, ale tylko jeśli czytelnik dostanie value.

**Przykład:**

```markdown
# Złe (append-only):
## Module 1 design
[stara wersja]

## Module 1 design v2 (2026-05-15)
[nowa wersja — ale stara nadal tu jest]
```

```markdown
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
ls *.md | measure | select Count    # PowerShell

# 3. Czy CLAUDE.md nadal aktualny?
# Read CLAUDE.md → confirm że "Status: Faza X" matches reality

# 4. Czy są niezamknięte branches > 7 dni?
git branch -v
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
| `config.example.yaml` | root | YES (jeśli używamy YAML overlay) |
| `config.yaml` | root | NO (gitignored, ma values) |
| `.pre-commit-config.yaml` | root | YES |
| `.python-version` | root | YES (pyenv pin) |

## Anti-bloat checklist (co fazę)

- [ ] `git ls-files *.md | wc -l` — czy w limicie (≤ 8 root + ≤ 5 ADR + 1 DOCX)?
- [ ] `find src/ -name "*.py" | xargs wc -l | tail -1` — total LOC trend (jeśli grow > 30% per fazę → audit complexity)
- [ ] `pip list | wc -l` — total deps (drift check: ile było po Fazie 1 vs teraz)
- [ ] `git log --oneline | wc -l` — commit count per fazę (mega-low = mega-commits problem; mega-high = brak squash)
- [ ] Stare orphan files (`git status -u` szuka untracked)

## Rule overrides

Jeśli REGUŁA Z TEGO PLIKU staje na drodze sensownej pracy:

1. **STOP** — nie łam reguły blindly
2. Uzasadnij w 1 zdaniu (commit message lub PR description)
3. Jeśli reguła zawodzi systemowo → update tego pliku (commit `docs: update FILE_HYGIENE rule X — Y rationale`)

**Anti-pattern:** ciche łamanie reguł bez updateu. Albo reguła obowiązuje (i ją updateujemy gdy nie pasuje), albo nie obowiązuje (i ją usuwamy).
