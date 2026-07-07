#!/usr/bin/env python3
"""Tests + exhaustiveness guard for classify_changes.py (run in quality-gate).

Two checks:

1. Assertion table - representative change sets map to the expected deployable
   flag and image set. Includes the original umbra trap: a docs PR that also
   touches scripts/checks/ must stay non-deployable.

2. Exhaustiveness guard - every tracked file (git ls-files) must be claimed by
   some rule. Any "unknown" path fails the run, forcing a human to classify a
   new top-level or image-context path before merge. This replaces the removed
   build_all fallback: instead of over-building in production when a path is
   unmapped, the merge is blocked in CI.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import classify_changes as cc  # noqa: E402

# (label, files, expected_deployable, expected_images)
CASES = [
    ("docs only", ["docs/x.md"], False, []),
    ("scripts/checks only", ["scripts/checks/06-check-deploy-contracts.py"], False, []),
    ("docs + scripts (umbra's original trap)",
     ["docs/agent.md", "scripts/checks/06-check-deploy-contracts.py"], False, []),
    (".github non-build file", [".github/dependabot.yml"], False, []),
    ("unknown root file (skip at runtime)", ["FOO.toml"], False, []),
    ("root metadata", [".gitignore"], False, []),
    ("no changes", [], False, []),
    ("website source", ["portals/website/app/page.tsx"], True, ["umbra-website"]),
    ("console source", ["portals/console/app/page.tsx"], True, ["umbra-console"]),
    ("admin source", ["portals/admin/app/page.tsx"], True, ["umbra-admin"]),
    ("brand fan-out", ["brand/logo.png"], True,
     ["umbra-admin", "umbra-console", "umbra-website"]),
    ("account service", ["services/account/account.py"], True, ["umbra-account-api"]),
    ("account dockerfile", ["services/account/Dockerfile"], True, ["umbra-account-api"]),
    ("subproxy service", ["services/subproxy/subproxy.py"], True, ["umbra-subproxy"]),
    ("nginx dockerfile", ["docker/umbra-nginx.Dockerfile"], True, ["umbra-nginx"]),
    ("configs only (deploy, no rebuild)", ["configs/nginx/nginx.conf"], True, []),
    ("deploy script only (deploy, no rebuild)", ["deploy/deploy.sh"], True, []),
    ("compose only (deploy, no rebuild)", ["docker-compose.yml"], True, []),
    ("mixed source + docs", ["portals/website/app/x.tsx", "docs/y.md"], True, ["umbra-website"]),
    ("multi-image", ["portals/website/app/x.tsx", "services/subproxy/subproxy.py"], True,
     ["umbra-subproxy", "umbra-website"]),
]


def run_cases():
    failures = []
    for label, files, exp_dep, exp_imgs in CASES:
        result = cc.classify(files)
        if result["deployable"] != exp_dep or result["build_images"] != sorted(exp_imgs):
            failures.append(
                f"[FAIL] {label}: got deployable={result['deployable']} "
                f"images={result['build_images']}; expected deployable={exp_dep} "
                f"images={sorted(exp_imgs)}")
        else:
            print(f"[ OK ] {label}: deployable={result['deployable']} "
                  f"images={result['build_images']}")
    return failures


def run_exhaustiveness():
    out = subprocess.run(
        ["git", "ls-files"], check=True, capture_output=True, text=True).stdout
    files = [f for f in out.splitlines() if f]
    unknown = [f for f in files if cc.classify_file(f)[0] == "unknown"]
    if unknown:
        print(f"[FAIL] {len(unknown)} tracked file(s) match no classifier rule:")
        for f in unknown:
            print(f"         {f}")
        print("       Claim each path in classify_changes.py "
              "(map to an image, or mark deploy / skip).")
        return [f"{len(unknown)} unclassified tracked file(s)"]
    print(f"[ OK ] exhaustiveness: all {len(files)} tracked files are claimed by a rule")
    return []


def main():
    failures = run_cases() + run_exhaustiveness()
    if failures:
        print()
        for line in failures:
            print(line)
        print(f"\nchange classifier checks failed: {len(failures)}")
        return 1
    print("\nchange classifier checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
