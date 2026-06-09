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

**Branch protection** is enforced via modern GitHub **Rulesets** (NOT legacy branch
protection — `branches/*/protection` returns 404; check `gh api repos/vxture/umbra/rulesets`).
Two active rulesets, "Umbra main release gate" (17155095) and "Umbra develop quality
gate" (17155096), each enforce on their branch: block deletion, block non-fast-forward,
require linear history, and require the `quality-gate` status check with
`strict_required_status_checks_policy: true` (branch must be up-to-date with base before
merge — tightened 2026-06-08). Repo merge settings (also tightened 2026-06-08):
squash-merge only (`allow_merge_commit`/`allow_rebase_merge` = false),
`delete_branch_on_merge` = true. The **develop** ruleset ALSO enforces a `pull_request`
rule with `required_approving_review_count: 0` (added 2026-06-08, solo-dev): merges to
develop MUST go through a PR but need no approval -- you cannot `git push origin develop`
directly anymore, open a PR even for trivial changes. This closed the last workflow gap
("PR-only was convention, not enforced") and was VERIFIED 2026-06-08: a direct
`git push origin develop` is rejected with `GH013 ... Required status check "quality-gate"
is expected` + `Changes must be made through a pull request`. The **main** ruleset deliberately
has NO `pull_request` rule: main only advances via promote.yml's `git push origin
HEAD:main` (a direct FF push, not a PR). A pull_request rule on main with no bypass actor
WOULD BLOCK that promotion push ("Changes must be made through a pull request") and break
production releases -- do not add one unless you also add a bypass actor for the promotion
identity.

**Branch flow (strict — `main` is protected, no direct human push):**
```
feature branch -> PR to develop -> ci (quality-gate) -> squash-merge to develop
  -> ci on develop -> controlled promotion develop->main (promote.yml, workflow_dispatch)
  -> release on main PUSH: detect -> docker-build (6 images) -> deploy-worker-03 (auto SSH)
```
NOTE (P3a+P3b, 2026-06-08): CI no longer runs on `main` (it re-tested the
identical FF'd sha). docker-build.yml + deploy-worker-03.yml were CONSOLIDATED
into a single `release.yml` triggered on `push: main` (event=push, github.sha)
with three sequential jobs detect -> docker-build -> deploy-worker-03 (one
change-detection pass, no workflow_run hops). The promote FF push (via
PROMOTION_TOKEN PAT) fires `on: push`, so the chain runs. To find the last
deploy/base, query `gh run list --workflow release.yml` (NOT the old files).
GOTCHA (fixed PR #28, 2026-06-08): release.yml `detect` must NOT use a bash
associative array read under `set -u` -- an empty `${#want[@]}`/`${!want[@]}`
raises "unbound variable" (bash 5.2). It only triggers when a deployable change
maps to NO image (scripts-/configs-/deploy-/compose-only). PR #27 (a scripts-only
change) was the first to hit it; the release run failed at detect but production
was unaffected (CI-only change, no-op deploy). detect now uses a space-separated
string deduped via `sort -u`. A deployable-but-no-image change correctly yields
build_images=[] -> all images retagged -> deploy recreates nothing.
GOTCHA (fixed PR #30, 2026-06-08): Next.js standalone `server.js` binds to
`$HOSTNAME`, and Docker auto-sets HOSTNAME to the container id, so the
website/console/admin containers listened only on the container IP, NOT
127.0.0.1. nginx (service-name -> container IP) worked so the site was fine, but
the 127.0.0.1 `/api/health` container healthcheck added in #29 could never pass
(stuck "health: starting", deploy warned "not healthy after 60s"). Fix: set
`ENV HOSTNAME=0.0.0.0` in each portal runner stage. (python services
account/subproxy already bind 0.0.0.0, so their loopback healthchecks were fine.)
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
- Two timing/efficiency facts to respect (see [[cicd-efficiency-findings]]):
  - After merging a PR to develop you MUST wait for develop's `quality-gate` to go
    green BEFORE running promote.yml -- promoting too fast fails validation
    (conclusion != success), main is left untouched. (Hit this 2026-06-08.)
  - docker-build/deploy each run a `detect` job that compares the promoted sha
    against the last successful deploy; docs-only diffs (docs/, .claude/, root md,
    LICENSE) skip build+deploy. Detect uses `gh run list --repo "$REPO"` (NO
    checkout, so --repo is required or base resolves empty -> always deploys).
- Deploy is **digest-pinned** (P1): `23-start` renders `$DATA_DIR/docker-compose.digests.yml`
  via `26-pin-image-digests.py` and runs `up -d --remove-orphans` with it. External
  images (marzban/vaultwarden) pin to their running digest and correctly stay `Running`
  across deploys. Minimal-recreate is delivered by **P2** (PR #23): docker-build's `detect`
  outputs `build_images` (changed-file -> image map; unknown paths -> build all), and each
  matrix job builds changed images while `imagetools create`-retagging the rest
  (latest -> sha-<commit>, same digest). Unchanged images keep their digest, so the deploy
  recreates ONLY changed services. VERIFIED 2026-06-08 (PR #24): changing only subproxy.py
  recreated ONLY umbra-subproxy; the other 7 stayed Running (healthy in 2s).
  (History: P1 alone did NOT achieve this -- buildx mints a new digest per build even for
  identical content, so before P2 every push rebuilt all 6 and recreated all 6. The
  "cache hit -> identical digest" assumption was wrong; P2's build-vs-retag is what makes
  unchanged digests stable.)
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
