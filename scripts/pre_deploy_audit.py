"""Pre-deploy audit — BLOCK gdy stale state lub uncommitted changes.

Run: python scripts/pre_deploy_audit.py [--force --reason "<concrete>"]

Per ~/.claude/rules/common/multi-worktree.md:
- Sprawdza czy current branch jest up-to-date vs main
- Sprawdza czy nie ma innych branches z ahead commits (drift risk)
- Sprawdza czy testy pass
- Sprawdza czy nie ma uncommitted changes
- Override: --force --reason "<concrete>" (audit log w deploy marker)

Exit codes:
  0 — clean, deploy OK
  1 — warning (deploy z ostrożnością)
  2 — BLOCK (NIE deployuj bez --force --reason)
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


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git", *args], cwd=REPO_ROOT, capture_output=True, text=True, check=False
    )
    return result.stdout.strip()


def run_cmd(cmd: list[str]) -> tuple[int, str]:
    result = subprocess.run(
        cmd, cwd=REPO_ROOT, capture_output=True, text=True, check=False
    )
    return result.returncode, result.stdout + result.stderr


def main() -> int:
    parser = argparse.ArgumentParser(description="Pre-deploy audit")
    parser.add_argument("--force", action="store_true", help="Override audit (requires --reason)")
    parser.add_argument("--reason", help="Concrete reason dla --force override")
    parser.add_argument("--skip-tests", action="store_true", help="Skip pytest run")
    args = parser.parse_args()

    if args.force and not args.reason:
        print("❌ --force requires --reason '<concrete>'")
        return 2

    print(f"=== Pre-Deploy Audit ({datetime.now(timezone.utc).isoformat()}) ===\n")

    issues = []
    warnings = []

    # 1. Current branch
    current = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    head = run_git(["rev-parse", "--short", "HEAD"])
    last_tag = run_git(["describe", "--tags", "--abbrev=0"]) or "(none)"
    print(f"[1/5] Current: {current} @ {head}, last tag: {last_tag}")
    print()

    # 2. Uncommitted changes
    uncommitted = run_git(["status", "--porcelain"])
    n_uncommitted = len([line for line in uncommitted.splitlines() if line.strip()])
    if n_uncommitted > 0:
        issues.append(f"{n_uncommitted} uncommitted files")
        print(f"[2/5] ❌ {n_uncommitted} uncommitted files")
        print(uncommitted)
    else:
        print("[2/5] ✅ No uncommitted changes")
    print()

    # 3. Up-to-date vs main
    if current != "main":
        behind = run_git(["rev-list", "--count", f"{current}..main"])
        ahead = run_git(["rev-list", "--count", f"main..{current}"])
        print(f"[3/5] vs main: {ahead} ahead, {behind} behind")
        if int(behind or "0") > 0:
            warnings.append(f"branch behind main by {behind} commits — consider merge main first")
    else:
        print("[3/5] ✅ on main")
    print()

    # 4. Other branches drift check
    raw = run_git(
        [
            "for-each-ref",
            "--format=%(refname:short)|%(committerdate:iso-strict)",
            "refs/heads/",
        ]
    )
    other_ahead: list[tuple[str, int]] = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        try:
            name, _ = line.split("|")
        except ValueError:
            continue
        if name == current:
            continue
        ahead = run_git(["rev-list", "--count", f"{current}..{name}"])
        n = int(ahead or "0")
        if n > 0:
            other_ahead.append((name, n))

    if other_ahead:
        print(f"[4/5] ⚠️  {len(other_ahead)} other branches z ahead commits:")
        for name, n in other_ahead:
            print(f"      {name}: {n} commits ahead — drift risk")
        warnings.extend([f"{n} ahead w {name}" for name, n in other_ahead])
    else:
        print("[4/5] ✅ No drift risk (no other branches ahead)")
    print()

    # 5. Tests
    if args.skip_tests:
        print("[5/5] ⏩ Tests SKIPPED (--skip-tests)")
    else:
        print("[5/5] Running pytest -x...")
        rc, out = run_cmd(["pytest", "-x", "-q", "tests/"])
        if rc != 0:
            issues.append("pytest failed")
            print("❌ Tests FAILED:")
            print(out[-2000:])  # last 2KB
        else:
            print("✅ Tests pass")
    print()

    # Summary
    print("=" * 60)
    if issues:
        print(f"❌ BLOCK ({len(issues)} blocking issues):")
        for issue in issues:
            print(f"   - {issue}")
        if args.force:
            print()
            print(f"⚠️  --force used. Reason: {args.reason}")
            print("   Logging override w deploy marker.")
            return 0
        print()
        print("Fix issues lub use: python scripts/pre_deploy_audit.py --force --reason '<concrete>'")
        return 2

    if warnings:
        print(f"⚠️  WARNING ({len(warnings)} warnings):")
        for w in warnings:
            print(f"   - {w}")
        print()
        print("Deploy OK ale z ostrożnością.")
        return 1

    print("✅ ALL CLEAN — deploy approved")
    return 0


if __name__ == "__main__":
    sys.exit(main())
