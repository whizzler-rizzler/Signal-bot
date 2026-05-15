# RESUME_INDEX — Deep Owl

> **Router** wskazujący który dokument do czego. Zacznij sesję TUTAJ.

> **Snapshot:** v0.1.3 · **Status:** Faza 0 (planning + skeleton) · **HEAD:** `main`
>
> Staleness check: jeśli `git rev-parse HEAD` ≠ commit z tagu `v0.1.3` → ten plik MOŻE być stary. Patrz `git log --oneline | head -5`.

## Jak używać

1. Zacznij od **README.md** jeśli to pierwszy raz
2. Jeśli wracasz po przerwie — czytaj **PHASES.md** (current focus)
3. Konkretne pytanie? Użyj routera poniżej

## Router — co gdzie

### "Co to za projekt? Jak odpalić?"
→ [README.md](README.md) — quick start, 1 ekran

### "Dla Claude Code — jaki jest project context?"
→ [CLAUDE.md](CLAUDE.md) — KRYTYCZNE: zastępuje parent market_maker context

### "Jak działa system — high-level?"
→ [ARCHITECTURE.md](ARCHITECTURE.md) — hexagonal architecture (connectors / processors / engines / orchestrator), data flow, key decisions

### "Deep dive na konkretny moduł — co i dlaczego?"
→ [docs/deep_owl_v1.md](docs/deep_owl_v1.md) — long-form architecture deck (14 sekcji)

### "Jaki tech stack? Dlaczego DuckDB nie Postgres? Jak parallelism?"
→ [TECH_STACK.md](TECH_STACK.md) — Python 3.11+, asyncio, websockets, DuckDB, multiprocessing pool, libs choice z uzasadnieniem

### "Jaki DB schema? Jak partycjonowanie? Query patterns?"
→ [DATABASE.md](DATABASE.md) — wszystkie tabele, indexes, migrations, common queries, performance tips

### "Skąd bierzemy dane? API endpoints? Rate limity?"
→ [DATA_SOURCES.md](DATA_SOURCES.md) — pełna matryca connectors per source/type, WS + REST + RSS

### "Jak działają sygnały? Methodology? Walk-forward?"
→ [RESEARCH.md](RESEARCH.md) — signal theory (Wyckoff, funding squeeze, OI buildup), walk-forward methodology, literature

### "Gdzie jesteśmy? Co dalej? Co już zrobione?"
→ [PHASES.md](PHASES.md) — plan faz z checkboxami, current focus, definition of done

### "Jaka konwencja branchy / commitów / PR?"
→ [GIT_WORKFLOW.md](GIT_WORKFLOW.md) — branch naming, commit format, tag scheme

### "Co mogę a czego nie mogę dodać do repo?"
→ [FILE_HYGIENE.md](FILE_HYGIENE.md) — hard limity, hexagonal rules, anti-patterns

### "Co się zmieniło między tagami?"
→ [CHANGELOG.md](CHANGELOG.md) — Keep a Changelog format, per-tag entries

## Per use case

| Use case | Plik(i) |
|---|---|
| **Pierwsze uruchomienie** | README.md → PHASES.md → CLAUDE.md |
| **Sesja po przerwie** | RESUME_INDEX.md (ten plik) → PHASES.md → CHANGELOG.md |
| **Dodaj nowy CEX connector** | DATA_SOURCES.md → ARCHITECTURE.md (sekcja Connectors) → FILE_HYGIENE.md (rules) |
| **Dodaj nowy engine** | ARCHITECTURE.md (sekcja Engines) → RESEARCH.md (methodology) → FILE_HYGIENE.md (engine independence rule) |
| **Zmień DB schema** | DATABASE.md → ARCHITECTURE.md (data flow) → migration plan w PHASES.md |
| **Zmień stack/dep** | TECH_STACK.md → requirements.txt → CHANGELOG.md |
| **Optymalizacja perf** | TECH_STACK.md (parallelism) → ARCHITECTURE.md (skala) → DATABASE.md (query tips) |
| **Onboarding nowy chat** | CLAUDE.md → RESUME_INDEX.md (ten plik) → PHASES.md |
| **Pisanie ADR** | docs/decisions/ADR-NNNN-{slug}.md → cytuj w CHANGELOG |

## Quick reference — kluczowe liczby

| Metryka | Wartość |
|---|---|
| **MD files w root** | max 12 (te z tabeli powyżej) |
| **ADR w docs/decisions/** | max 5 w fazach 0-6 |
| **Long-form deck** | 1 plik (`docs/deep_owl_v1.md`) |
| **Engines per file** | 1 (każdy w osobnym) |
| **Lines per Python file** | max 400 (max 800 absolute) |
| **Universe scope** | ~3000-4000 tokens (4 priorytetowe CEX) |
| **Tier classification** | 1-4 (top100 / top500 / top2000 / rest) |
| **WS connections total** | ~9 trwałych (across 4 CEX) |
| **Storage estimate** | ~25-30GB DuckDB / rok |
| **Cost (Faza 0-6)** | $0 — WS unlimited, free APIs wystarczą |

## Kolejność czytania pełnej dokumentacji (top-down)

Jeśli chcesz przeczytać CAŁOŚĆ:

1. **README.md** (3 min) — co to jest
2. **CLAUDE.md** (5 min) — project context + isolation rules
3. **RESUME_INDEX.md** (ten plik, 3 min) — router
4. **PHASES.md** (5 min) — gdzie jesteśmy
5. **ARCHITECTURE.md** (15 min) — hexagonal high-level
6. **TECH_STACK.md** (10 min) — stack deep dive
7. **DATABASE.md** (10 min) — DB deep dive
8. **DATA_SOURCES.md** (10 min) — wszystkie connectors
9. **RESEARCH.md** (15 min) — methodology
10. **docs/deep_owl_v1.md** (30 min) — long-form deck (subset above + extras)
11. **GIT_WORKFLOW.md** (3 min) — convention
12. **FILE_HYGIENE.md** (5 min) — anti-sprawl rules
13. **CHANGELOG.md** (2 min) — historia tagów

**Total ~2h** dla pełnego onboardingu. Powinno wystarczyć żeby zacząć Fazę 1.

## Stan dokumentacji per faza

| Faza | Docs status |
|---|---|
| 0 (TERAZ) | ✅ Wszystkie 12 root MD + long-form deck + skeleton repo |
| 1 (next) | TBD: dodać ADR-0001 jeśli pojawi się decyzja techniczna |
| 2-6 | Update PHASES.md + CHANGELOG.md per zamknięty tag, ARCHITECTURE.md per major change |

## Anti-patterns dokumentacji

- ❌ Nie czytaj parent `D:\Crypto\Claude\CLAUDE.md` — to inny projekt (market_maker)
- ❌ Nie szukaj `notes.md`, `RESUME_PROMPT.md`, `HANDOFF.md` — używamy TYLKO 12 plików z tabeli FILE_HYGIENE
- ❌ Nie rób append-only edits — redaguj w miejscu, sekcja "Historical" tylko jeśli czytelnik dostanie value
- ❌ Nie twórz per-module README w `src/...` — single ARCHITECTURE.md jest source of truth
