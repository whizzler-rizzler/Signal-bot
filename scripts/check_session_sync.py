"""Session start sync check — multi-branch awareness.

Run: python scripts/check_session_sync.py [--all-branches] [--stale-detect]

Per ~/.claude/rules/common/multi-worktree.md:
- Każda sesja MUSI sprawdzić czy nie ma innych aktywnych branches z divergence
- Stale candidates (>7 dni) flagowane jako warning
- Output: sensowny przegląd dla user przed startem pracy

Exit codes:
  0 — clean state, możesz pracować
  1 — warning (stale branches, ale OK)
  2 — block (uncommitted changes lub serious divergence — uzgodnij z user)
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Force UTF-8 stdout (Windows default cp1250 nie obsluguje emoji)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


REPO_ROOT = Path(__file__).resolve().parent.parent
STALE_DAYS = 7
ARCHIVE_DAYS = 14
DELETE_DAYS = 30


def run_git(args: list[str]) -> str:
    """Run git command, return stdout stripped."""
    result = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, check=False
    )
    return result.stdout.strip()


def list_branches() -> list[tuple[str, datetime, str]]:
    """List local branches z last commit date i SHA."""
    raw = run_git(
        [
            "for-each-ref",
            "--format=%(refname:short)|%(committerdate:iso-strict)|%(objectname:short)",
            "refs/heads/",
        ]
    )
    branches = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        try:
            name, date_str, sha = line.split("|")
            date = datetime.fromisoformat(date_str)
            branches.append((name, date, sha))
        except ValueError:
            continue
    return branches


def current_branch() -> str:
    return run_git(["rev-parse", "--abbrev-ref", "HEAD"])


def uncommitted_changes() -> int:
    """Count uncommitted changes (staged + unstaged)."""
    output = run_git(["status", "--porcelain"])
    return len([line for line in output.splitlines() if line.strip()])


def branch_metadata_exists(branch: str) -> bool:
    """Sprawdz czy branches/<branch>.md istnieje."""
    if branch == "main":
        return (REPO_ROOT / "branches" / "main.md").exists()
    safe_name = branch.replace("/", "_")
    return (REPO_ROOT / "branches" / f"{safe_name}.md").exists()


def main() -> int:
    parser = argparse.ArgumentParser(description="Session start sync check")
    parser.add_argument(
        "--all-branches", action="store_true", help="List wszystkich branches"
    )
    parser.add_argument(
        "--stale-detect", action="store_true", help="Show only stale branches"
    )
    args = parser.parse_args()

    print(f"=== Session Sync Check ({datetime.now(timezone.utc).isoformat()}) ===\n")

    # 1. Current branch state
    current = current_branch()
    head = run_git(["rev-parse", "--short", "HEAD"])
    last_tag = run_git(["describe", "--tags", "--abbrev=0"]) or "(none)"
    uncommitted = uncommitted_changes()

    print(f"[1/4] Current branch: {current} @ {head}")
    print(f"      Last tag: {last_tag}")
    print(f"      Uncommitted changes: {uncommitted}")
    if uncommitted > 0:
        print(f"      ⚠️  WARNING: {uncommitted} uncommitted files — commit/stash before pracą")
    print()

    # 2. Branch metadata check
    if not branch_metadata_exists(current):
        print(f"[2/4] ❌ MISSING: branches/{current}.md")
        print(f"      → Skopiuj branches/_template.md i uzupełnij PRZED next commit")
        print(f"      (pre-commit hook BLOCK bez tego pliku)")
    else:
        print(f"[2/4] ✅ Branch metadata OK: branches/{current}.md")
    print()

    # 3. Other active branches
    branches = list_branches()
    now = datetime.now(timezone.utc)
    other_branches = [(name, date, sha) for name, date, sha in branches if name != current]

    print(f"[3/4] Other branches ({len(other_branches)}):")
    if not other_branches:
        print("      (brak innych branches — solo workflow)")
    else:
        for name, date, sha in sorted(other_branches, key=lambda x: x[1], reverse=True):
            age_days = (now - date).days
            ahead = run_git(["rev-list", "--count", f"{current}..{name}"])
            behind = run_git(["rev-list", "--count", f"{name}..{current}"])
            status = "active"
            if age_days > DELETE_DAYS:
                status = "🔴 DELETE candidate (>30d)"
            elif age_days > ARCHIVE_DAYS:
                status = "🟡 ARCHIVE candidate (>14d)"
            elif age_days > STALE_DAYS:
                status = "⚠️  STALE candidate (>7d)"

            meta_status = "📋" if branch_metadata_exists(name) else "❌ no metadata"
            print(
                f"      {name} @ {sha} | age {age_days}d | {ahead} ahead, {behind} behind | {status} | {meta_status}"
            )
    print()

    # 4. Stale branches summary
    stale = [
        (name, date) for name, date, _ in branches if (now - date).days > STALE_DAYS
    ]
    print(f"[4/4] Stale candidates (>{STALE_DAYS}d): {len(stale)}")
    for name, date in stale:
        print(f"      {name} | {date.date()} ({(now - date).days}d ago)")

    print()

    # Exit code
    if uncommitted > 0 or sum(
        1 for _, d, _ in other_branches
        if int(run_git(["rev-list", "--count", f"{current}..{_}"]) or "0") > 0
    ) > 2:
        print("❌ BLOCK: za dużo divergence lub uncommitted changes — uzgodnij z user")
        return 2

    if stale:
        print(f"⚠️  WARNING: {len(stale)} stale branches — rozważ archive/merge")
        return 1

    print("✅ OK — możesz pracować")
    return 0


if __name__ == "__main__":
    sys.exit(main())
