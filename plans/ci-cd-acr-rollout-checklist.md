# CI/CD + ACR Rollout Checklist

This checklist tracks the controlled rollout from local Docker builds to
GitHub Actions CI, controlled branch promotion, ACR/GHCR image delivery, and
worker-03 deployment.

Source design:

- `docs/operations/github-actions.md`
- `docs/operations/github-actions-enablement.md`
- Vxture reference: `D:\MyWebSite\vxture\docs\deployment\05-ci-cd.md`

## Current Audit

| Area | Current state | Target state | Status |
|---|---|---|---|
| CI workflow | `.github/workflows/ci.yml` | `.github/workflows/ci.yml` with workflow `ci`, job `quality-gate` | done |
| Promotion workflow | `.github/workflows/promote.yml` manual controlled fast-forward | `.github/workflows/promote.yml` manual controlled fast-forward | done |
| Docker build workflow | `.github/workflows/docker-build.yml` | builds and pushes 6 images to GHCR + Aliyun ACR | done |
| Deploy workflow | listens to `docker-build` and exports ACR image tag | listens to `docker-build`, pulls pushed images, starts compose, verifies | done |
| Compose images | six Umbra-owned `image:` entries using registry variables | six Umbra-owned `image:` entries using ACR repo names | done |
| Admin service | `umbra-admin` service uses `ruyin-admin` image | `umbra-admin` service uses `ruyin-admin` image | done |
| Dockerfiles | website/console/admin plus nginx/account-api/subproxy Dockerfiles exist | add nginx/account-api/subproxy Dockerfiles | done |
| Env template | image registry/tag variables exist | add image registry/tag variables for deploy | done |
| Contract checks | final workflow/compose contracts enforced | enforce final workflow/compose contracts after implementation | done |

## Image Mapping

All production images live in the Aliyun ACR namespace `vxture`.

| ACR repository | Target container/service | Source |
|---|---|---|
| `ruyin-website` | `umbra-website` | `portals/website/Dockerfile` |
| `ruyin-console` | `umbra-account-web` | `portals/console/Dockerfile` |
| `ruyin-admin` | `umbra-admin` | `portals/admin/Dockerfile` |
| `ruyin-nginx` | `umbra-nginx` | new Dockerfile required |
| `ruyin-account-api` | `umbra-account` | new Dockerfile required |
| `ruyin-subproxy` | `umbra-subproxy` | new Dockerfile required |

External upstream images remain external:

| Container | Image |
|---|---|
| `umbra-marzban` | `gozargah/marzban:latest` |
| `umbra-vaultwarden` | `vaultwarden/server:latest` |

## Phase 1 - Workflow Contract Cleanup

- [x] Rename `quality-gate.yml` to `ci.yml`.
- [x] Change workflow name from `Quality Gate` to `ci`.
- [x] Keep job/check name stable as `quality-gate`.
- [x] Delete `promote-develop-to-main.yml`.
- [x] Add `promote.yml` with `workflow_dispatch`.
- [x] Require `target=main`.
- [x] Require `expected_sha`.
- [x] Require `release_confirmed=true`.
- [x] Require non-empty `release_note`.
- [x] Validate `expected_sha == origin/develop`.
- [x] Validate `origin/main` is ancestor of `origin/develop`.
- [x] Push with `git merge --ff-only origin/develop`.
- [x] Do not force-push.

Validation:

```bash
python scripts/deploy/08-check-script-contracts.py
git diff --check
```

## Phase 2 - Runtime Image Packaging

- [x] Add Dockerfile for `ruyin-nginx`.
- [x] Add Dockerfile for `ruyin-account-api`.
- [x] Add Dockerfile for `ruyin-subproxy`.
- [x] Decide whether `ruyin-nginx` image should include static base config only
      or rendered configs. Preferred: keep rendered configs as mounted runtime
      state because certs and vhosts are generated on worker-03.
- [x] Account API image must copy `services/account/account.py`.
- [x] Subproxy image must copy `services/subproxy/subproxy.py`.
- [x] Keep account DB mounted at `${DATA_DIR}/account`.
- [x] Keep nginx rendered config/cert volumes mounted from `${DATA_DIR}`.

Validation:

```bash
docker build -f <dockerfile> .
python -m compileall -q services
```

## Phase 3 - Compose Image Contract

- [x] Add `.env.example` variables:
      `IMAGE_REGISTRY`, `IMAGE_NAMESPACE`, `IMAGE_TAG`.
- [x] Change `umbra-nginx.image` to
      `${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/ruyin-nginx:${IMAGE_TAG:-latest}`.
- [x] Change `umbra-subproxy.image` to
      `${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/ruyin-subproxy:${IMAGE_TAG:-latest}`.
- [x] Change `umbra-account.image` to
      `${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/ruyin-account-api:${IMAGE_TAG:-latest}`.
- [x] Change `umbra-account-web.image` to
      `${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/ruyin-console:${IMAGE_TAG:-latest}`.
- [x] Change `umbra-website.image` to
      `${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/ruyin-website:${IMAGE_TAG:-latest}`.
- [x] Add `umbra-admin.image` as
      `${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/ruyin-admin:${IMAGE_TAG:-latest}`.
- [x] Decide nginx routing for `umbra-admin` before exposing it. If not routed
      yet, service can exist without being in nginx upstreams.
- [x] Remove production reliance on bind-mounted Python source files.
- [x] Keep `build:` blocks only if local development requires them; production
      CI/CD should use `image:`.

Validation:

```bash
docker compose --env-file .env.example config --quiet
```

## Phase 4 - Docker Build Workflow

- [x] Add `.github/workflows/docker-build.yml`.
- [x] Trigger from successful `ci` workflow on `main` push.
- [x] Use `github.event.workflow_run.head_sha` as `PASSED_SHA`.
- [x] Build matrix for all 6 ACR repositories.
- [x] Tag images as `latest` and `sha-<short-sha>`.
- [x] Push every image to GHCR.
- [x] Push every image to Aliyun ACR.
- [x] Fail workflow if either registry push fails.
- [x] Pass `NODE_AUTH_TOKEN` as BuildKit secret for website/console.
- [x] Use `brand_context=./brand` for website/console/admin builds.

Required secrets:

| Secret | Required |
|---|---:|
| `PROMOTION_TOKEN` | yes |
| `NODE_AUTH_TOKEN` | yes |
| `ALIYUN_ACR_REGISTRY` | yes |
| `ALIYUN_ACR_NAMESPACE` | yes |
| `ALIYUN_ACR_USERNAME` | yes |
| `ALIYUN_ACR_PASSWORD` | yes |

## Phase 5 - worker-03 Deploy Workflow

- [x] Update `deploy-worker-03.yml` to listen to `docker-build`, not `ci`.
- [x] Use built `PASSED_SHA`.
- [x] Compute `IMAGE_TAG=sha-<short-sha>`.
- [x] SSH to worker-03.
- [x] Fast-forward repo to `PASSED_SHA`.
- [x] Run config/cert preparation required by current deploy scripts.
- [x] Login to ACR if required.
- [x] Export `IMAGE_REGISTRY`, `IMAGE_NAMESPACE`, `IMAGE_TAG`.
- [x] Run `docker compose pull`.
- [x] Run `docker compose up -d`.
- [x] Run `bash scripts/deploy.sh verify`.

Required secrets:

| Secret | Required |
|---|---:|
| `WORKER_03_HOST` | yes |
| `WORKER_03_USER` | yes |
| `WORKER_03_SSH_KEY` | yes |
| `WORKER_03_PORT` | optional |
| `WORKER_03_REPO_DIR` | optional |
| `WORKER_03_KNOWN_HOSTS` | recommended |
| `ALIYUN_ACR_REGISTRY` | yes |
| `ALIYUN_ACR_NAMESPACE` | yes |
| `ALIYUN_ACR_USERNAME` | if worker-03 needs login |
| `ALIYUN_ACR_PASSWORD` | if worker-03 needs login |

## Phase 6 - Contract Checks

- [x] Update `scripts/deploy/08-check-script-contracts.py` to require final
      workflow names and files.
- [x] Require no `promote-develop-to-main.yml`.
- [x] Require no workflow-run automatic `develop -> main` promotion.
- [x] Require `docker-build.yml` matrix contains all 6 ACR repositories.
- [x] Require `deploy-worker-03.yml` listens to `docker-build`.
- [x] Require compose contains all 6 ACR image repository names.
- [x] Require `IMAGE_REGISTRY`, `IMAGE_NAMESPACE`, `IMAGE_TAG` in `.env.example`.

## Phase 7 - End-to-End Verification

- [x] Run local static checks:

```bash
git diff --check
python scripts/deploy/08-check-script-contracts.py
python -m compileall -q scripts services
bash -n scripts/deploy.sh scripts/ops.sh scripts/server.sh
```

- [x] Run portal checks:

```bash
npm run type-check --prefix portals/website
npm run type-check --prefix portals/console
npm run build --prefix portals/website
npm run build --prefix portals/console
npm run build --prefix portals/admin
```

- [x] Run Docker image build checks once Docker Desktop is fully available:

```bash
docker compose --env-file .env.example config --quiet
docker build -f portals/website/Dockerfile portals/website
docker build -f portals/console/Dockerfile portals/console
docker build -f portals/admin/Dockerfile portals/admin
```

Completed locally:

- [x] `docker compose --env-file .env.example config --quiet`
- [x] Docker is running: Docker Engine `29.5.2`, Compose `v5.1.4`.
- [x] Dockerfile `--check` passed for all six image Dockerfiles using local
      placeholder base images.
- [x] Local image build passed for all six repositories using `umbra-local/*:test`
      tags.
- [x] Website and console builds passed with BuildKit secret
      `npm_token` sourced from `NODE_AUTH_TOKEN`.
- [x] Dockerfiles now support local base image overrides:
      `NGINX_BASE_IMAGE`, `PYTHON_BASE_IMAGE`, and `NODE_BASE_IMAGE`.
- [x] Console and admin Docker build contexts now exclude local `.next`,
      `node_modules`, and TypeScript build cache artifacts.

## Phase 8 - Enablement Checklist

- [x] Add first-run enablement checklist.
- [x] Document required repository secrets.
- [x] Document `worker-03` environment secrets.
- [x] Document branch ruleset expectations.
- [x] Document worker-03 runtime prerequisites.
- [x] Document temporary Docker Desktop gap and non-Docker checks.
- [x] Add local env template at `private/github-actions.local.env`.
- [x] Add `scripts/github/set-github-secrets.ps1` for GitHub secret sync.
- [x] Add secrets in GitHub repository settings, including `PROMOTION_TOKEN`.
- [x] Add `worker-03` environment secrets.
- [x] Configure branch rulesets for `develop` and `main`.
      Active repository rulesets:
      `Umbra develop quality gate` and `Umbra main release gate`.
      Both require `quality-gate`, linear history, no branch deletion, and no
      force push. Pull-request-only updates are not enabled in this phase so
      controlled fast-forward promotion can still update `main`.
- [ ] Run first controlled promotion.
- [ ] Confirm first `docker-build` publishes all six ACR images.
- [ ] Confirm first `deploy-worker-03` production deployment.

## Known Risks

- `umbra-admin` is built and started, but production nginx still routes
  `admin.ruyin.ai/dashboard/` to Marzban and `/invites` to account web.
- `deploy.sh all` still performs environment, certificate, config, backup, and
  verify steps; image pulling happens inside `scripts/deploy.sh start`.
- GitHub repository rulesets may block promotion until `PROMOTION_TOKEN` and
  bypass rules are configured.
- ACR pull may require `docker login` on worker-03.
