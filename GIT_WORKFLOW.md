# Git Workflow — Deep Owl

> Standalone repo, solo dev, ale dyscyplina jak zespół. Cel: ZERO regresji + clean history.

## Repository setup

```powershell
cd D:\Crypto\Claude\Breakout_signals
git init
git config core.autocrlf true       # Windows line endings
git config commit.gpgsign false     # zakładamy że off — match parent
git add .
git commit -m "chore: initial skeleton (Faza 0)"
git tag v0.0.0
```

**Remote (opcjonalnie, później):**
```powershell
git remote add origin git@github.com:Kuba/deep-owl.git
git push -u origin main --tags
```

## Branch model

**Default branch:** `main`

**Branch naming convention:**

| Prefix | Cel | Przykład |
|---|---|---|
| `phase-N/` | Praca w obrębie konkretnej fazy | `phase-2/dexscreener-adapter` |
| `fix/` | Bugfix poza fazą | `fix/duckdb-connection-leak` |
| `docs/` | Tylko docs (no code) | `docs/update-architecture` |
| `refactor/` | Refactor bez nowej funkcjonalności | `refactor/extract-rate-limiter` |
| `experiment/` | Eksperymentalne, max 7 dni żywotności | `experiment/duckdb-vs-sqlite` |

**Direct push do `main` ZABRONIONY** (po Fazie 1 — pre-commit hook).

**Solo dev PR flow** (nawet bez teamu):
```powershell
git checkout -b phase-2/dexscreener-adapter
# ...work...
git commit -m "feat(data): dexscreener async client with rate limit"
git push -u origin phase-2/dexscreener-adapter
gh pr create --title "Phase 2: Dexscreener adapter" --body "..."
# Self-review w GitHub UI (świeże oczy po commitach)
gh pr merge --squash
git checkout main && git pull
git branch -d phase-2/dexscreener-adapter
```

**Rationale dla PR-only:** wymusza review odległy w czasie (po committach widzimy 'big picture' inaczej niż w trakcie pisania), squash daje clean linear history.

## Commit format — Conventional Commits

```
<type>(<scope>): <description>

<optional body>

<optional footer>
```

**Types:**

| Type | Kiedy |
|---|---|
| `feat` | Nowa funkcjonalność |
| `fix` | Bugfix |
| `refactor` | Restrukturyzacja bez zmiany zachowania |
| `docs` | Tylko docs/comments |
| `test` | Dopisanie/modyfikacja testów |
| `chore` | Build, deps, config, scaffolding |
| `perf` | Optymalizacja perf |
| `ci` | CI config |
| `style` | Formatting (ruff/mypy) |

**Scopes** (rekomendowane):

- `data` — adapters (dexscreener, birdeye, rugcheck, goplus)
- `db` — DuckDB schema, migrations, queries
- `mod1` / `mod2` / `mod3` — modules
- `output` — telegram, dashboard, paper_trader
- `cli` — CLI
- `config` — settings, env
- `docs` — docs files
- `tests` — testy

**Przykłady:**
```
feat(data): dexscreener async client with rate limit
fix(db): close duckdb connection on shutdown
refactor(mod1): extract scoring weights to config
docs(architecture): add data flow diagrams
test(mod3): add golden fixtures for breakout strategy
chore: bump pydantic to 2.7
perf(db): add index on signals(token_address, timestamp)
```

**Description rules:**
- Lowercase, no period at end
- Imperative mood ("add", not "added")
- Max 72 chars łącznie z prefix
- Body (jeśli potrzebny) wyjaśnia **WHY**, nie WHAT

## Rules — co NIE robić

- ❌ `git push --force` na `main` (ZAWSZE odmów)
- ❌ `git commit --amend` po push (overwriting history)
- ❌ `git rebase -i` (wymaga interaktywnego editora — nie ma sensu solo dev z squash merges)
- ❌ `git commit --no-verify` (bypass pre-commit hook) — chyba że user EXPLICIT prosi
- ❌ Commit z secretami (sprawdź `.env` w `.gitignore` PRZED każdym `git add`)
- ❌ Commit `data/`, `logs/`, `*.duckdb` (gitignored, ale czasem ludzie forsują `git add -f`)
- ❌ Commit auto-generated docs/build artifacts
- ❌ Mega-commits ("feat: add module 1") — split do logical chunks
- ❌ Cherry-pick między feature branches (lepiej rebase albo merge — cherry-pick gubi context)

## Pre-commit hooks (faza 1+)

`.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: ruff
        name: ruff check + format
        entry: ruff
        args: [check, --fix]
        language: system
        types: [python]

      - id: ruff-format
        name: ruff format
        entry: ruff
        args: [format]
        language: system
        types: [python]

      - id: mypy
        name: mypy strict
        entry: mypy
        args: [src/deep_owl]
        language: system
        types: [python]
        pass_filenames: false

      - id: pytest-quick
        name: pytest -x (fast)
        entry: pytest
        args: [-x, -q, --timeout=10]
        language: system
        pass_filenames: false
        stages: [pre-push]    # pre-push, NIE pre-commit (za wolne dla każdego commit)
```

**Install:** `pre-commit install && pre-commit install --hook-type pre-push`

**Bypass tylko z explicit user approval:** `git commit --no-verify` lub `SKIP=mypy git commit`.

## Tagging strategy

**Per zamkniętą fazę:** `v0.{phase}.0`

| Tag | Po fazie | Stan |
|---|---|---|
| `v0.0.0` | 0 | Skeleton + docs |
| `v0.1.0` | 1 | Bootstrap (deps, logger, db client) |
| `v0.2.0` | 2 | DEX adapters |
| `v0.3.0` | 3 | Backtest engine |
| `v0.4.0` | 4 | Module 1 (accumulation) |
| `v0.5.0` | 5 | Module 2 (fresh) |
| `v0.6.0` | 6 | Output (telegram + dashboard + paper) |
| `v1.0.0` | post-6 | Production-ready dla daily use |

**Hotfix między fazami:** `v0.{phase}.1`, `v0.{phase}.2`, etc.

```powershell
git tag -a v0.2.0 -m "Phase 2: DEX adapters complete"
git push --tags
```

## Multi-worktree

**SKIP — nie dotyczy.** Solo dev, jeden cwd. Jeśli kiedykolwiek > 2 active branches dłużej niż 7 dni → loadujemy parent's `~/.claude/rules/common/multi-worktree.md` rules + `branches/*.md` metadata files.

## Pull Request template (faza 1+)

Sugerowane `.github/pull_request_template.md`:

```markdown
## Summary
<1-3 zdania co i po co>

## Faza
<np. Faza 2 — Dexscreener adapter>

## Zmiany
- ...
- ...

## Test plan
- [ ] `pytest -q` pass
- [ ] `ruff check src/` clean
- [ ] `mypy src/deep_owl/` clean
- [ ] Coverage ≥ 80% (jeśli dotyka kodu hot-path)
- [ ] Manual test (jeśli I/O): `deep-owl <command>` runs end-to-end

## Anti-regression
- [ ] Sprawdziłem czy poprzednie testy nadal działają
- [ ] CHANGELOG.md zaktualizowany (jeśli faza zamknięta)
- [ ] PHASES.md checkbox flipped (jeśli odpowiedni)

## Notes
<edge cases, follow-ups, known issues>
```
