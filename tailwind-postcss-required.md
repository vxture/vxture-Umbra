---
name: tailwind-postcss-required
description: Umbra portals MUST run @tailwindcss/postcss or DS @theme typography/font tokens are dropped (undefined -> 16px fallback)
metadata: 
  node_type: memory
  type: project
  originSessionId: c2dc1088-9581-41d8-b7d2-afc558993196
---

The `@vxture/design-system` CSS is authored for a Tailwind v4 build: DS
`globals.css` does `@import "tailwindcss"` and `typography.css` defines the
typography sizes + font-family slots inside a `@theme {}` block (colors live in
plain `:root` and so always worked). `@theme {}` is NOT understood by browsers;
it only becomes real `:root` custom properties after the Tailwind v4 compiler
(`@tailwindcss/postcss`) processes it.

All three portals (website/console/admin) shipped WITHOUT this compiler (no
`postcss.config`, `@tailwindcss/postcss` not installed). Result: every `@theme`
block reached the browser raw and was silently dropped, so all
`--vx-typography-*` and `--font-*` tokens were undefined. Any rule using them
(e.g. `.site-brand-name { font-size: var(--vx-typography-heading-2-size) }`)
became invalid-at-computed-value-time and fell back to the inherited 16px - the
brand wordmark also lost Funnel Display. This masquerades as a cascade/specificity
or stale-cache bug but is neither; the rule is correct, the token just never
exists at runtime. Diagnose by grepping the SERVED css
(`/_next/static/css/app/layout.css`) for a literal `@theme {` - if present, the
compiler is not running.

Fix (applied 2026-06-10, branch `fix/website-footer-layout`): in each portal,
`npm i -D @tailwindcss/postcss@4.3.0 tailwindcss@4.3.0` (matching the DS's
tailwindcss 4.3.0) and add `postcss.config.mjs` with
`plugins: { "@tailwindcss/postcss": {} }`. This compiles `@theme` -> `:root` (and
tree-shakes; served css 843KB -> 599KB) WITHOUT authoring any utility classes -
consistent with the [[portal-redesign]] "no Tailwind utilities" rule. Verified:
all 3 production builds green; dev-served css has 0 `@theme` blocks and resolves
the tokens. Must restart `next dev` + clear `.next` after adding the config
(PostCSS config is read at boot). Note Next's Bash CWD persists between tool
calls - `cd <portal>` before `npm run dev`/`build` or you start the wrong portal.

PENDING DS TASK (the real root cause, not yet fixed): the DS leaves the
`--vx-typography-*` size/line-height/letter-spacing tokens ONLY in `@theme`,
while it DOES mirror the `--font-*` tokens into a plain `:root {}` block (so
font-family resolved even pre-Tailwind - only the SIZE fell back to 16px). The
asymmetry "footer adjustable, header not" was exactly this: footer used a literal
`14px`, header used `var(--vx-typography-heading-2-size)` (undefined -> invalid ->
16px). DS React components do NOT consume the size tokens (only portal CSS + the
unused `brand.css` do), so a no-Tailwind fix is viable. The clean fix is upstream
in `@vxture/design-system` (`D:/MyWebSite/vxture`): mirror `--vx-typography-*`
into `:root` like `--font-*` already is. Filed as request #5 in
`docs/design/ds-extension-requests.md` (target DS >= 1.4). User chose to KEEP
Tailwind for now (2026-06-10); once the DS ships the `:root` mirror, Umbra can
drop @tailwindcss/postcss + postcss.config. See [[portal-redesign]].
