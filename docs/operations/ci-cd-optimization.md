# CI/CD Optimization Record (2026-06)

Authoritative design doc: [`github-actions.md`](github-actions.md). This file is
the actionable record of the 2026-06 optimization round: the goals, the change
set, the pitfalls that cost real debugging time, how each item was verified, and
the invariants that must not be broken when touching the workflows again.

Workflows in scope: `.github/workflows/{ci,promote,release}.yml`. `docker-build`
and `deploy-worker-03` are jobs inside `release.yml`, not standalone files.

Shipped as PRs #37, #38, #39 (all squash-merged to develop and promoted to
production; main was at `455fb13` after this round).

## Goals

| ID | Goal | Outcome |
|----|------|---------|
| 1 | Remove cold portal builds in CI | Per-portal Next.js build cache |
| 2 | Remove serial portal builds in CI | Three portals build in parallel |
| 3 | Share the buildx cache with CI | Not done (see Deferred) |
| 4 | Survive the Buildx setup infra flake | First attempt retried once |
| 5 | Remove the dead `main` PR-trigger ambiguity | Documented as a deliberate guard |
| 6 | Fix workflow documentation drift | CLAUDE.md matches reality |
| 7 | Stop redeploying production for CI-only changes | detect skips `.github/*` |

Headline result: CI wall-clock dropped from ~5m03s (old single job) to ~1m15s
(parallel jobs), roughly 4x. A workflow-only promotion now causes zero
production churn.

## Change Set

### PR #37 - parallel portal builds + Next.js cache (`ci.yml`)

The single `quality-gate` job was split into three jobs:

- `static-checks` - repo-global script and contract checks plus
  `docker compose config`, independent of portal `node_modules`.
- `portal-build` - a per-portal matrix (website, console, admin) with
  `fail-fast: false`, so type-check and `next build` run concurrently and one
  portal failing still reports the others. Each leg restores and saves its
  `.next/cache` via `actions/cache`.
- `quality-gate` - an aggregator job (`needs: [static-checks, portal-build]`)
  that preserves the required status-check name.

The `main` entry under `pull_request.branches` was kept and commented as a
deliberate guard (`main` normally advances only via `promote.yml` fast-forward,
but a direct PR to `main` should still run the gate).

### PR #38 - buildx retry + docs (`release.yml`, `CLAUDE.md`)

- `Set up Docker Buildx` marks its first attempt `continue-on-error: true` and a
  second step retries `if` the first failed, so a transient buildkit-image pull
  flake does not fail the release. Both attempts failing still fails the job.
- CLAUDE.md: corrected that `docker-build` and `deploy-worker-03` are jobs in
  `release.yml` (not workflow files) and that `ci` does not run on `main` (the
  `main` push triggers `release`, not `ci`).

### PR #39 - skip build+deploy for `.github/*` (`release.yml`)

The `detect` job mapped `.github/*` to the catch-all `*)` branch, which set
`build_all=true` and marked the change deployable, so a workflow-only promotion
rebuilt all six images and recreated every container. `.github/*` is now in the
documentation/metadata no-op branch of both detect case statements (the
deployability check and the image mapping). Workflow-only changes skip build and
deploy; a mixed change still builds only the affected image.

### Deferred - #3 (share buildx cache with CI)

Not done by design. CI runs a bare `next build`, not a docker build, so there is
no shared cache surface with the registry image builds. `release.yml` already
uses the GitHub Actions buildx cache (`cache-from`/`cache-to: type=gha`).

## Pitfalls

### Pitfall 1 - the required check name must survive a job split

The branch ruleset requires a status check literally named `quality-gate`.
Splitting the work into parallel jobs is only safe if one job is still named
exactly `quality-gate`. The aggregator job fills that role: it succeeds only
when all upstream jobs succeed, and any upstream failure leaves it skipped,
which the ruleset treats as not-passing and blocks the merge. Renaming or
removing that job silently breaks merge gating and promotion.

### Pitfall 2 - npm drops the token on GitHub Packages tarball downloads

Symptom: with the parallel matrix, the console and admin legs failed cold
installs deterministically with:

```text
npm error 401 Unauthorized - GET https://npm.pkg.github.com/download/@vxture/shared/<v>/<sha> - authentication token not provided
```

What it was NOT (each ruled out by evidence):

- Not concurrency. Re-running a single leg alone still failed.
- Not a lockfile URL difference. All three portals had identical `resolved`
  `/download/` URLs.
- Not fixable with `always-auth=true`. npm 10 ignores it.

Root cause: `npm ci --prefix portals/<p>` run from the repo root against the
root `.npmrc` authenticates the package metadata request but drops the token on
the follow-up GitHub Packages `/download/` tarball request. The old single job
never hit this because its installs ran sequentially and the first portal's
successful download warmed the shared npm cache for the rest, so the other
portals never made a cold tarball request.

Fix (mirrors the portal Dockerfiles, which were already correct): run `npm ci`
from inside the portal directory with a co-located `.npmrc` and no `--prefix`.

```yaml
- name: Install dependencies
  working-directory: portals/${{ matrix.portal }}
  shell: bash
  run: |
    set -euo pipefail
    printf '@vxture:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n' > .npmrc
    trap 'rm -f .npmrc' EXIT
    npm ci
```

The `${NODE_AUTH_TOKEN}` placeholder is written literally and substituted by npm
at runtime from the environment, so the secret never passes through shell
expansion and cannot leak into logs.

### Pitfall 3 - detect treats unknown paths as a full rebuild

`detect` maps any path it does not recognize to `build_all=true` (a deliberate
"over-building never ships stale code" safety default). Adding a path to the
no-op set requires editing both case statements, not just one: the deployability
check and the image mapping. Only allowlist paths that provably ship nothing
into the runtime images (workflows, docs, claude memory, repo scripts).

### Operational notes

- PowerShell cannot pass a multi-line commit message via heredoc or a
  single-quoted here-string (it splits into pathspecs). Use `git commit -F
  <file>` or the Bash tool.
- After `develop` advances, a feature branch must be brought up to date before
  merge (the ruleset is strict / up-to-date with base): rebase onto
  `origin/develop` and push with `--force-with-lease`.

## Verification

| Item | Evidence |
|------|----------|
| #1, #2 speed | parallel legs ~1m12s plus a 4s gate (~1m15s) vs the old 5m03s single job |
| npm auth fix | all three `portal-build` legs pass on cold installs |
| #4 buildx | all six `docker-build` matrix jobs succeed |
| #7 skip | `detect` logs `scope: deployable=false reason=docs-only build_images=[]`, and `docker-build` + `deploy-worker-03` both report `skipped` |
| no release regression | the #37/#38 promotion ran a normal six-image build and `deploy-worker-03` verify success |

General debugging methods used this round:

1. Validate locally first: parse YAML with a Python one-liner and run
   `python scripts/checks/06-check-deploy-contracts.py` (ASCII plus contract
   invariants).
2. For bash logic such as `detect`, build a small local harness over sample
   inputs instead of burning CI cycles.
3. To separate deterministic failures from flakes, re-run a single job with
   `gh run rerun <run-id> --job <job-id>` for a no-concurrency control.
4. For a root cause, read raw logs (`gh run view --job <id> --log`) to see the
   actual request URL, not just the summary line.

## Invariants

- `promote.yml` checks the develop head commit's `quality-gate == success`, that
  `main` is an ancestor of develop, then fast-forwards. `main` has no
  pull-request rule on purpose; adding one without a bypass actor for the
  promotion identity would block releases.
- Squash-merge only, linear history; always branch off `origin/develop`.
- `scripts/checks/06-check-deploy-contracts.py` enforces ASCII over source and
  doc paths (this file included) and forbids the retired
  `docker-build.yml`/`deploy-worker-03.yml` filenames from reappearing.
- detect's "unknown path -> build_all" is intentional. Only allowlist paths that
  are provably runtime-irrelevant.
