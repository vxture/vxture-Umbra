---
name: cicd-efficiency-findings
description: "CI/CD efficiency work log: 2026-06-08 P0-P3 redesign DONE, 2026-06-09 round 2 (parallel CI + caches + .github skip) DONE and in production"
metadata: 
  node_type: memory
  type: project
  originSessionId: 62f560b2-c7b8-44ad-bbaf-862bdb49bc15
---

# Round 2 shipped 2026-06-09/10 (PRs #37 #38 #39, all in production, main=455fb13)

Second optimization pass over the 3 live workflows (`ci`/`promote`/`release`).
All deployed via develop -> promote. Related: [[cicd-deploy-flow]].

- **#37**: split `ci.yml` `quality-gate` into parallel jobs -- `static-checks`
  + a per-portal `portal-build` matrix (website/console/admin, `fail-fast:false`)
  + a `quality-gate` aggregator that KEEPS the required-check name (rulesets
  require a check literally named `quality-gate`). Added per-portal `.next/cache`
  via actions/cache. CI wall-clock 5m3s -> ~1m15s (~4x).
- **#38**: `release.yml` Buildx setup retry (first attempt continue-on-error +
  one retry) for the known infra flake; fixed CLAUDE.md drift (docker-build /
  deploy-worker-03 are JOBS in release.yml, not files; `ci` does NOT run on main).
- **#39**: `release.yml` `detect` now treats `.github/*` as non-deployable/no-op
  in BOTH case statements -> a workflow-only promotion skips build+deploy
  (VERIFIED live: promoting 455fb13 gave `deployable=false reason=docs-only
  build_images=[]`, docker-build + deploy-worker-03 both `skipped`). This RESOLVES
  the old line-74 caveat that editing a workflow file forced `build_all`.
- **Deferred**: sharing buildx cache with CI (CI uses bare `next build`, no shared
  cache surface; release already uses gha buildx cache).

GOTCHA found + fixed this round: the parallel matrix exposed a latent npm-auth
bug masked by the old serial single job. `npm ci --prefix portals/<p>` from the
repo root against the root `.npmrc` authenticates the @vxture METADATA request
but DROPS the token on the GitHub Packages `/download/` TARBALL fetch -> cold
installs fail `401 authentication token not provided`. `always-auth=true` does
NOT help (npm 10 ignores it). FIX (matches the portal Dockerfiles): run `npm ci`
from inside the portal dir with a co-located `.npmrc` and NO `--prefix`. The old
single job never hit it because its sequential installs shared one warm npm cache.

# CI/CD Efficiency Findings (identified 2026-06-08)

Reviewed all 4 workflows after a full release cycle on 2026-06-08, then began a
phased redesign (chosen direction: D1 digest deploy + E1 single release workflow).
Related: [[cicd-deploy-flow]].

Follow-up shipped 2026-06-08 (PR #29): the three Next.js portals (website,
console, admin) now have `app/api/health` routes + docker-compose healthchecks
(probed via in-image node `fetch`), closing the P0-deferred portal-healthcheck
gap. Verified on promotion: only the 3 portals rebuilt+recreated (P2), the other
5 services stayed Running, deploy succeeded.

**Shipped so far (2026-06-08):**
- **P0** (PR #20): healthchecks for umbra-account (/health:3281) and umbra-subproxy
  (/health:8080) via in-image python; admin type-check added to ci.
- **P1** (PR #21): digest-pinned deploy + orphan cleanup. `23-start-docker-services.sh`
  now runs `26-pin-image-digests.py` to generate a `$DATA_DIR/docker-compose.digests.yml`
  override pinning every service to an immutable @sha256 (owned -> pulled deploy-tag
  digest; external marzban/vaultwarden -> currently-running digest = locked), then
  `docker compose -f base -f override up -d --remove-orphans` (falls back to tag-based
  up if pinning fails). This fixes the "all 6 recreate every deploy" heaviness: steady
  state now only recreates services whose digest changed. The first digest deploy
  (fed74e7) recreated everything once as a tag->digest transition (expected) and removed
  the umbra-portal orphan. External images are now locked to digests.

- **P2** (PR #23, shipped + VERIFIED 2026-06-08 via PR #24): docker-build's `detect`
  maps changed files to the image(s) they feed and outputs `build_images`; each static
  matrix job builds changed images and `docker buildx imagetools create`-retags the rest
  (latest -> sha-<commit>, same digest, no rebuild). Unknown/ambiguous paths force a full
  rebuild (safe). Deploy side untouched -- because unchanged images keep their digest, the
  P1 digest pin keeps their containers. PROOF (PR #24, changed only subproxy.py): docker-build
  built only ruyin-subproxy + retagged the other 5; deploy recreated ONLY umbra-subproxy,
  the other 7 stayed Running, healthy in 2s. The "P1 insufficient" gap is now closed.

- **P3a** (PR #25, shipped + VERIFIED 2026-06-08): dropped the redundant main-push CI run.
  `ci.yml` no longer runs on push:main; `docker-build.yml` triggers on `push: main` directly
  (github.sha replaces workflow_run.head_sha). deploy-worker-03 unchanged (still workflow_run
  on docker-build). PROOF after promoting e7edec0: ci runs on main = 0, docker-build event=push,
  deploy event=workflow_run -> chain intact. Saves ~4 min per release. Design doc + contract
  checks updated to the push-trigger model.

- **P3b** (PR #26, shipped + VERIFIED 2026-06-08): implemented as **E1** (single merged
  workflow, lower risk than reusable workflows for the same benefit). docker-build.yml +
  deploy-worker-03.yml are GONE, merged into one `release.yml` (on push:main) with three
  sequential jobs: detect -> docker-build (matrix) -> deploy-worker-03. detect runs once;
  no workflow_run hops. Deploy logic + worker scripts byte-identical (github.sha). PROOF
  after promoting 8b49274: a single `release [push]` run with detect + 6 build jobs + deploy,
  NO separate docker-build/deploy runs; deploy healthy in 10s. Contract checks + design doc
  rewritten; old workflow files added to absent_paths. Note: creating release.yml as a new
  file made SonarCloud flag 4 Security Hotspots (the relocated, unchanged SSH/credential
  deploy patterns) -- resolved by one-time "review as Safe" in the SonarCloud UI (the GitHub
  check-run stays stale-red after review; SonarCloud is NOT a required ruleset check, only
  quality-gate is).

**The CI/CD redesign (P0-P3) is COMPLETE.** Remaining nit:
- Cosmetic smell in `06-check-deploy-contracts.py`: the literal ".github/workflows/release.yml"
  is duplicated ~7 times (SonarCloud maintainability); define a module constant when next
  editing that file. Also the docker-build detect `reason=` log label can read stale
  (functionless). Neither affects behavior.
- `plans/ci-cd-acr-rollout-checklist.md` keeps point-in-time references to the now-deleted
  docker-build.yml/deploy-worker-03.yml (historical record, contract check still passes).
- **Cosmetic**: docker-build detect's `scope:` log shows `reason=docs-only` even when
  deployable=true with a real build set (the `reason` var stops updating once `build_all`
  / per-image mapping fires). Functionless log string; deployable + build_images are
  correct. Fix when next touching docker-build.yml (NOT in a single-service test PR, since
  editing docker-build.yml is an unmapped path -> forces build_all).
- **P3**: E2 topology refactor (release.yml + _build/_deploy reusable workflows) AND drop
  the redundant main-push ci run (re-tests the same FF sha; trigger build on push:main).
- Both still touch `scripts/checks/06-check-deploy-contracts.py` + `docs/operations/github-actions.md`.

**Real redundancies (worth fixing later, all touch `scripts/checks/06-check-deploy-contracts.py` + `docs/operations/github-actions.md`):**

1. `quality-gate` runs 3x on the same code: PR->develop (needed gate),
   develop push (needed: promote.yml + main ruleset both require quality-gate
   success on that sha), and **main push (redundant)**. After FF promotion,
   main == develop is the SAME commit, so ci-on-main re-tests identical content.
   Its only function today is triggering `docker-build` via `workflow_run`. It
   sits on the release critical path (~4 min). Fix: trigger `docker-build` on
   `push: main` and drop `push: main` from ci. Safe because main only advances
   via promote.yml (which verifies quality-gate==success) and the main ruleset
   requires the quality-gate check (satisfied by the reused develop-sha
   check-run). Mechanical: docker-build must switch `github.event.workflow_run.head_sha`
   -> `github.sha`. Saves ~4 min per release.

2. Two identical ~35-line `detect` jobs (inline scope detection duplicated in
   docker-build.yml and deploy-worker-03.yml). Fix options: extract a composite
   action (single source of truth), OR merge docker-build + deploy into one
   workflow so detect runs once and one workflow_run hop is removed.

**Minor (coverage gap):** admin type-check was missing from ci -- DONE in P0.
External images marzban/vaultwarden were unpinned `:latest` -- now locked to
their running digest by P1's digest deploy.

**Confirmed NOT redundant (leave alone):** develop-push ci (promote depends on
it), the 6-image matrix, ACR+GHCR dual login, `npm ci` x3 (separate package
dirs), cancel-in-progress settings.

**Local repo note:** main is CI/CD-controlled (no direct push), so a local
`main` branch is useless and was deleted 2026-06-08. Keep only local `develop`
(needed as the base for feature branches); branch off `origin/develop`.
