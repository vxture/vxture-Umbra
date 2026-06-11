# Memory Index

- [Project Overview](project-overview.md) — Stack, domain layout, architecture, Marzban HTTP-proxy decision
- [Deployment Modules](deployment-modules.md) — deploy.sh dispatcher, step scripts, config update workflow
- [CI/CD Deploy Flow](cicd-deploy-flow.md) — git flow to worker-03, promotion command, promote/docker-build/deploy gotchas
- [CI/CD Efficiency Findings](cicd-efficiency-findings.md) — work log: 2026-06-08 P0-P3 redesign + 2026-06-09 round 2 (parallel CI, .next cache, .github-skip, npm /download/ auth fix) all DONE in prod
- [Memory Versioning Preference](memory-versioning-preference.md) — version memory inside vxture/umbra on the claude-memory branch, not a new repo
- [Portal Redesign](portal-redesign.md) — 3-portal redesign: strict-DS+var (no Tailwind), vxture ref repo at D:/MyWebSite/vxture, DS extension asks, guardrail 09, PR #49, Hermes-removal caveat
- [Tailwind PostCSS Required](tailwind-postcss-required.md) — portals MUST run @tailwindcss/postcss or DS @theme typography/font tokens drop to 16px; fixed 2026-06-10
- [Clash Rule IP-CIDR Only](clash-rule-ipcidr-only.md) — must-direct rules accept only DOMAIN/DOMAIN-SUFFIX/IP-CIDR; IPv6 uses IP-CIDR, never IP-CIDR6 (aborts deploy); learned 2026-06-11
