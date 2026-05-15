# Branch: main

**Purpose:** Production branch. Tagged releases (v0.0.0, v0.1.0, ...). Solo dev linear history (squash merges z phase branches).
**Owner:** Kuba
**Status:** active
**Target merge:** N/A (to jest target dla wszystkich phase branches)
**ETA merge:** N/A
**Created:** 2026-05-15
**Last activity:** 2026-05-15
**Tier:** N/A (main jest receiver)

## Faza w roadmapie

Wszystkie zamknięte fazy:
- ✅ Faza 0 (v0.0.0 → v0.1.4) — planning + skeleton + branch hygiene infra
- 🟡 Faza 1 (next) — repo bootstrap (venv + DB + logger + CLI)

## Touches

Wszystko (main jest receiver dla zatwierdzonych phase branches).

## Dependencies

Brak — main jest baseline.

## Goal

Stabilna baza dla wszystkich phase branches. Każdy tag (`v0.X.Y`) reprezentuje state production-ready.

## Definition of Done (per merge na main)

- [ ] Phase branch przeszedł `Definition of Done` w swoim metadata
- [ ] PR review (self-review po commitach — squash merge)
- [ ] All tests pass
- [ ] CHANGELOG.md zaktualizowany
- [ ] Tag `v0.X.Y` po merge

## Notes

- Direct push do main ZABRONIONY (po Fazie 1 — pre-commit hook enforcement)
- Force push na main ZAKAZANE (NIGDY)
- Squash merge preferred (linear history)
