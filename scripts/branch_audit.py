"""Daily branch audit — gdy >3 active branches.

Run: python scripts/branch_audit.py [--archive-stale] [--report-only]

Per ~/.claude/rules/common/multi-worktree.md:
- Liczy commits per branch z ostatnich 24h
- Identyfikuje "today's merge candidates"
- Suggests archive/delete actions per stale branches

Exit codes:
  0 — clean (≤3 active branches)
  1 — warning (>3 active, audit zalecany)
  2 — action required (>5 active, mandatory cleanup)
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Force UTF-8 stdout (Windows default cp1250 nie obsluguje emoji)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


REPO_ROOT = Path(__file__).resolve().parent.parent
STALE_DAYS = 7
ARCHIVE_DAYS = 14
DELETE_DAYS = 30
ACTIVE_BRANCH_THRESHOLD = 3


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, check=False
    )
    return result.stdout.strip()


def list_branches_with_age() -> list[tuple[str, datetime, str, int]]:
    """Returns (name, last_commit_date, sha, commits_24h)."""
    raw = run_git(
        [
            "for-each-ref",
            "--format=%(refname:short)|%(committerdate:iso-strict)|%(objectname:short)",
            "refs/heads/",
        ]
    )
    now = datetime.now(timezone.utc)
    branches = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        try:
            name, date_str, sha = line.split("|")
            date = datetime.fromisoformat(date_str)
            since = (now - date).total_seconds()
            commits_24h = 0
            if since < 86400:
                count_str = run_git(
                    ["rev-list", "--count", f"--since=24 hours ago", name]
                )
                commits_24h = int(count_str) if count_str.isdigit() else 0
            branches.append((name, date, sha, commits_24h))
        except ValueError:
            continue
    return branches


def main() -> int:
    parser = argparse.ArgumentParser(description="Daily branch audit")
    parser.add_argument(
        "--report-only", action="store_true", help="Only report, no suggestions"
    )
    args = parser.parse_args()

    print(f"=== Branch Audit ({datetime.now(timezone.utc).isoformat()}) ===\n")

    branches = list_branches_with_age()
    now = datetime.now(timezone.utc)

    active = [b for b in branches if (now - b[1]).days <= STALE_DAYS]
    stale = [b for b in branches if STALE_DAYS < (now - b[1]).days <= ARCHIVE_DAYS]
    archive_candidates = [
        b for b in branches if ARCHIVE_DAYS < (now - b[1]).days <= DELETE_DAYS
    ]
    delete_candidates = [b for b in branches if (now - b[1]).days > DELETE_DAYS]

    print(f"Total branches: {len(branches)}")
    print(f"  Active (≤{STALE_DAYS}d):       {len(active)}")
    print(f"  Stale ({STALE_DAYS}-{ARCHIVE_DAYS}d):    {len(stale)}")
    print(f"  Archive ({ARCHIVE_DAYS}-{DELETE_DAYS}d): {len(archive_candidates)}")
    print(f"  Delete (>{DELETE_DAYS}d):       {len(delete_candidates)}")
    print()

    # Today's activity
    todays_active = [(n, c) for n, d, _, c in active if c > 0]
    if todays_active:
        print(f"Today's activity ({len(todays_active)} branches):")
        for name, count in sorted(todays_active, key=lambda x: x[1], reverse=True):
            print(f"  {name}: {count} commits w 24h")
        print()

    # Suggestions
    if not args.report_only:
        if stale:
            print("⚠️  Stale candidates (consider merge or document why parked):")
            for name, date, sha, _ in stale:
                age = (now - date).days
                print(f"  {name} (last commit {age}d ago, {sha})")
                print(f"    → action: review branches/{name}.md, decide merge/park")
            print()

        if archive_candidates:
            print("🟡 Archive candidates (rename to archive/<name>):")
            for name, date, sha, _ in archive_candidates:
                age = (now - date).days
                print(f"  {name} ({age}d) → git branch -m {name} archive/{name}")
            print()

        if delete_candidates:
            print("🔴 Delete candidates (after backup tarball jeśli unique work):")
            for name, date, sha, _ in delete_candidates:
                age = (now - date).days
                print(f"  {name} ({age}d) → git branch -D {name}")
            print()

    # Exit code
    n_active = len(active) + len(stale)
    if n_active > 5:
        print(f"❌ ACTION REQUIRED: {n_active} active+stale branches (>5) — cleanup mandatory")
        return 2
    if n_active > ACTIVE_BRANCH_THRESHOLD:
        print(f"⚠️  WARNING: {n_active} active+stale branches (>3) — audit recommended")
        return 1

    print(f"✅ OK — {n_active} active+stale (≤{ACTIVE_BRANCH_THRESHOLD})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
