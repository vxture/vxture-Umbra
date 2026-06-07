---
name: cicd-deploy-flow
description: "GitHub Actions CI/CD git flow to ship a change to worker-03, the exact promotion command, and operational gotchas"
metadata: 
  node_type: memory
  type: project
  originSessionId: a24b8b4e-44c5-4c64-bea4-f7f29f002361
---

# CI/CD Deploy Flow (to worker-03)

Design doc: `docs/operations/github-actions.md`. This is the actionable runbook +
gotchas verified in practice. Service deploy internals live in [[deployment-modules]].

**Branch flow (strict — `main` is protected, no direct human push):**
```
feature branch -> PR to develop -> ci (quality-gate) -> squash-merge to develop
  -> ci on develop -> controlled promotion develop->main (promote.yml, workflow_dispatch)
  -> ci on main -> docker-build (6 images, GHCR+ACR) -> deploy-worker-03 (auto SSH)
```
`develop` = integration branch; updating `main` == production release approved.
Always branch off `origin/develop`, never off a stale local branch.

**Promotion command** (only normal path to advance `main`; needs develop CI green first):
```
gh workflow run promote.yml -f target=main \
  -f expected_sha=<origin/develop SHA> \
  -f release_confirmed=true \
  -f release_note="<summary>"
```
promote.yml validates: target=main, release_confirmed=true, release_note non-empty,
expected_sha == origin/develop, main is ancestor of develop, and develop's
`quality-gate` check == success. Then fast-forwards main and pushes.

**Gotchas:**
- `PROMOTION_TOKEN` IS configured, so the FF push to main triggers the downstream
  `ci -> docker-build -> deploy-worker-03` chain (GITHUB_TOKEN pushes would not).
- `docker-build` intermittently fails at **"Set up Docker Buildx"** (infra flake, not
  code). Fix: `gh run rerun <run-id> --failed`; the re-run's success re-fires deploy.
- promote.yml runs the workflow file from `main`, so workflow self-changes (e.g. action
  version bumps) show their effect/warnings one promotion late.
- Squash merges mean `git branch -d` refuses merged branches as "not fully merged";
  use `-D` after confirming the PR is MERGED via `gh pr view`.
- CI has an ASCII-only contract check on source/docs — non-ASCII (em-dashes `—`,
  smart quotes) fails `Static script checks`. Keep docs ASCII.
- Clash rule renders are guarded by `deploy/worker-03/scripts/19-check-clash-rules.py`
  during deploy `verify`; a green deploy means the rendered config passed it.
- After deploy, `git branch -vv` shows merged remotes as `: gone` (prune with
  `git fetch --prune`); local `main` can drift behind/diverge — realign with
  `git reset --hard origin/main`.
