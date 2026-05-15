# Changelog

Wszystkie zmiany w projekcie. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [Semantic Versioning](https://semver.org/).

## [Unreleased]

(Praca w toku — kandyduje do następnego tagu)

## [0.0.0] — 2026-05-15

Faza 0 — Plan-as-docs + skeleton.

### Added
- Skeleton repo struktura (src/deep_owl, tests, docs, scripts)
- 8 MD docs: CLAUDE.md, README.md, ARCHITECTURE.md, PHASES.md, DATA_SOURCES.md, GIT_WORKFLOW.md, FILE_HYGIENE.md, CHANGELOG.md
- 20-stronicowy DOCX pitch w `docs/deep_owl_v1.docx`
- Pydantic v2 + DuckDB + asyncio tech stack zdefiniowany
- pyproject.toml + requirements.txt + requirements-dev.txt
- .gitignore + .env.example
- Hard izolacja od parent market_maker context (own CLAUDE.md)

### Decisions
- Data sources: Hybrid (DEX-first via Dexscreener/Birdeye agregat + CEX reuse parent recorder)
- Chains: Multi-chain agregat (200+ via Dexscreener, Solana priority via Birdeye)
- Output: Sygnały + paper trading (no real wallet)
- Repo: Standalone (`git init` w Breakout_signals, własny CLAUDE.md)
- Storage: DuckDB (embedded, columnar, 1-file backup)
- Language: Python 3.11+

---

## Reguły aktualizacji

1. **Per zamkniętą fazę:** dodaj sekcję `## [0.{phase}.0] — YYYY-MM-DD` z `### Added / Changed / Fixed / Removed`
2. **Per hotfix:** `## [0.{phase}.{patch}] — YYYY-MM-DD`
3. **W Unreleased:** dopisuj w trakcie pracy, przenoś do nowej sekcji przy tagu
4. **Format wpisu:** 1-linijka per change (link do PR jeśli istnieje)
5. **NIE duplikuj** szczegółów z commit messages — tylko user-facing changes
