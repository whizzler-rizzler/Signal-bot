# Branch: <branch-name>

> **Wymagane** dla każdego branch != `main`. Bez tego pliku pre-commit hook BLOCK.
> Skopiuj ten template do `branches/<branch-name>.md` i uzupełnij.

**Purpose:** <jednym zdaniem co tu robimy>
**Owner:** <chat session ID lub user name (np. "Kuba" lub "claude-session-2026-05-15")>
**Status:** active | blocked | archive-candidate
**Target merge:** main | <other-branch>
**ETA merge:** YYYY-MM-DD
**Created:** YYYY-MM-DD
**Last activity:** YYYY-MM-DD
**Tier:** S | M | L (per CLAUDE.md tier detection)

## Faza w roadmapie

(Opcjonalne — np. "Faza 3a — CEX WebSocket connectors" lub "fix poza fazą")

## Touches (pliki / katalogi)

- `src/deep_owl/connectors/cex/binance/...` (przykład)
- `tests/unit/connectors/test_binance_ws.py`
- (lista wszystkich modyfikowanych ścieżek)

## Dependencies

- Inne branche które ten branch wymaga (np. czeka na merge z `phase-2/universe-builder`)
- External (np. CMC API key wymaga setup w .env)

## Goal

<konkretny cel — co po zakończeniu działa, co nie działało wcześniej>

## Definition of Done

- [ ] All tests pass: `pytest -x`
- [ ] Coverage ≥ 80% (jeśli touches hot path)
- [ ] `ruff check src/` clean
- [ ] `mypy src/deep_owl/` clean
- [ ] Pre-commit hook pass (hexagonal violations check)
- [ ] PHASES.md checkbox flipped (jeśli zamyka fazę)
- [ ] CHANGELOG.md entry (jeśli user-facing change)
- [ ] (Tier L) Cross-validation/sanity test

## Conflicts known

(Lista plików które inne branche też modyfikują — risk merge conflict)

## Notes

(Decisions, gotchas, follow-ups, refs)

---

## Rules

1. **Update `Last activity`** za każdym session-end na tym branch
2. **Status flip** gdy zmiana (active → blocked → active → archive-candidate)
3. **Stale jeśli >7 dni** bez activity — archive lub merge
4. **Pre-merge:** check `Definition of Done` checklista
