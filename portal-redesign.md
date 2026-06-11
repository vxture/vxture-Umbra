---
name: portal-redesign
description: "Three-portal (website/console/admin) redesign - strict-DS+var mode, vxture reference repo, DS extension asks, PR"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0c9786cc-f051-4652-8732-d1ca9a4e5f0f
---

Active redesign of the three Umbra portals (website / console / admin), design-first.

Locked decisions:
- Strict design-system usage: portals consume `@vxture/design-system` React
  components + `var(--vx-*)` tokens ONLY. No self-built design primitives
  (colors, fonts, shadows, radii) or duplicated DS component CSS. When DS is
  insufficient, extend the DS package (do not self-build).
- NO Tailwind UTILITY CLASSES authored in JSX. Stay on DS components + var
  tokens. BUT the Tailwind v4 COMPILER is still required: the DS ships its
  typography + font tokens inside `@theme {}` blocks (in `typography.css`, plus
  `@import "tailwindcss"`), which only become real `:root` custom properties
  after `@tailwindcss/postcss` runs. See [[tailwind-postcss-required]] - fixed
  2026-06-10 (all 3 portals were missing it; brand wordmark + all
  `--vx-typography-*`/`--font-*` were silently undefined -> 16px fallback).
- Content: website public homepage = Header + Hero + CTA + Footer ONLY; all
  capability sections are private (post-login, in console). Hero CTA changed
  from "Open Hermes" to "VXTURE STUDIO" -> https://vxture.com (Ruyin and Hermes
  are decoupled - just a button jump). Footer = DS `ShellLegalFooter` (bottom
  legal band only, no link columns). vpn.ruyin.ai trimmed to invite-register +
  client downloads only. Visual reference: stripe.com but WIDER content
  (~1600-1760px) and NO divider lines (open, whitespace-separated).
- Console: app grid + VPN self-service get a DS rebuild (current VPN page has
  poor info hierarchy). Admin: build a basic DS sidebar shell, keep external
  deep links (Marzban/Vaultwarden) unchanged for now.

Reference repo: `D:/MyWebSite/vxture` is the Vxture monorepo - the DS source
(`packages/design`) plus the website/admin reference apps (`portals/website`,
`portals/admin`). It is NOT a sibling of umbra inside vxturestudio/; it is at
`D:/MyWebSite/vxture` (umbra is at `D:/MyWebSite/vxturestudio/umbra`). DS already
exports `Shell*` primitives + `ShellLegalFooter`; gaps are higher-level
compositions.

DS extension requests (user will provide quickly): SiteHeader, AppShell,
Progress/UsageMeter - specced in `docs/design/ds-extension-requests.md`.

Guardrail: `scripts/checks/09-check-ds-usage.py` (report-only, NOT yet in CI;
07 prefix was taken by 07-run-local-quality-gate.ps1). Wire it with `--strict`
into ci.yml static-checks AFTER portals migrate. Baseline today: 27 findings.

Sequence: (1) DS reqs + guardrail = PR #49 [done] -> (2) infra (ruyin.css in all
3 layouts) + Console self-service rebuilt on DS = PR #50 [done; guardrail 27->16,
all 3 portals build] -> (3) Website homepage on DS + Hermes->VXTURE STUDIO = PR #51 [done; +70/-344].
-> (4) Admin basic DS sidebar shell, thin-composed from DS Shell* (stand-in for
DS AppShell) = PR #52 [done; +253/-255, deep links kept]. All 4 redesign PRs
(#49/#50/#51/#52) open against develop, each verified green locally, mergeable
in order (#50 owns the ruyin.css layout imports; others avoid touching those
files). #50 was EXPANDED with a 2nd commit migrating the invite console
(admin.ruyin.ai/invites) onto DS DataTable -> ALL console surfaces now on DS,
console/globals.css layout-only, guardrail console = 0. The invite-link 06
contract strings (inviteUrl, "Invite link", "Subscription / Invite link", "Copy
link", "Copy code") MUST stay in invite-console.tsx. .code-box was renamed
.url-box (DS has no code primitive; old name hit the 09 denylist). Remaining
follow-ups (not done): swap admin thin-shell to DS AppShell when delivered;
vpn.ruyin.ai trimmed guide + nginx 03-vpn-portal route (+06 vhost contract).

STATUS 2026-06-10: all four redesign PRs MERGED to develop (#49 7fbb9ad, #50
36a9215, #51 61e6696, #52 34ef663). develop guardrail 09 --strict = 0 findings.
09 --strict NOW WIRED into ci.yml static-checks via PR #53 [open] - regressions
to self-built styling fail CI going forward. Auto-merge is DISABLED on
vxture/umbra; develop ruleset is strict up-to-date, so merging stacked PRs needs
serial update-branch + CI + merge (a background poll loop handled it). Nothing
deployed: develop is integration only; production still needs promote.yml ->
main, which was NOT run.

PR ordering / coupling notes: #50 owns the `brands/ruyin.css` import in all 3
`app/layout.tsx`; #51 deliberately does NOT touch website layout (avoids conflict).
Removing "Hermes" from the site REQUIRED editing BOTH
deploy/worker-03/scripts/24-verify-deployment.sh (APEX+EDGE body asserts, now
"VXTURE STUDIO") AND the 06 contract needle. Deferred follow-up: vpn.ruyin.ai
still renders the homepage; the trimmed VPN guide (invite + downloads) needs an
nginx 03-vpn-portal route change (+ its 06 vhost contract) and is a separate PR.

**Why:** the portals hand-rolled `.btn/.card/.metric/.app-card` CSS instead of
using the rich DS; the user wants complete DS adoption enforced by an audit
script, not ad-hoc styling.

**How to apply:** build new portal UI from DS components + var tokens; run
`python scripts/checks/09-check-ds-usage.py` to track migration. CAVEAT for the
Website PR: `deploy/worker-03/scripts/24-verify-deployment.sh` and the `06`
contract both require the literal "Hermes" in the verify body check - removing
Hermes from the site means updating BOTH that script and the `06` needle, or the
deploy verify fails. See [[cicd-deploy-flow]] for the branch/PR/promote flow.
