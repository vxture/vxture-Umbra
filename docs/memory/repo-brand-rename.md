# Repo + Brand Rename (memory mirror)

> Source: `~/.claude/projects/D--MyWebSite-vxturestudio-umbra/memory/repo-brand-rename.md`
> on the `claude-memory` branch. When this file and the authoritative product
> docs disagree, the authoritative docs win.

Applied 2026-07-07 via PR #169 (code) and direct `gh api` call (GitHub repo rename).

## GitHub repo rename

`vxture/umbra` -> `vxture/vxture-Umbra` (2026-07-07), then lowercased to
`vxture/vxture-umbra` (2026-07-17, direct `gh repo rename`).
Remote URL: `https://github.com/vxture/vxture-umbra.git`.
GitHub redirects old URLs automatically (repo slugs are case-insensitive).

Use `vxture/vxture-umbra` in all `gh` commands, CLAUDE.md ruleset queries,
and any scripts referencing the repo slug.

## Internal brand rename: ruyin -> umbra

All product-level names changed in the codebase. Domains and URLs left intact.

| Changed | Old | New |
|---|---|---|
| Code identifiers | `ruyinBrand`, `ruyinBrandCore` | `umbraBrand`, `umbraBrandCore` |
| Product display name | `"Ruyin"` | `"Umbra"` |
| Env var names | `RUYIN_COOKIE_DOMAIN`, `RUYIN_BASE_URL` | `UMBRA_COOKIE_DOMAIN`, `UMBRA_BASE_URL` |
| OIDC client_id (default) | `ruyin` | `umbra` |
| OIDC custom scope | `ruyin` | `umbra` |
| Docker images (GHCR/ACR) | `ruyin-nginx`, `ruyin-account-api`, ... | `umbra-nginx`, `umbra-account-api`, ... |
| Dockerfile | `docker/ruyin-nginx.Dockerfile` | `docker/umbra-nginx.Dockerfile` |
| Nginx vhost file | `01-ruyin.conf.template` | `01-umbra.conf.template` |
| Brand assets | `ruyin-symbol-*.png`, `ruyin-hero-*.png`, `ruyin-logo-*.png` | `umbra-*` |

Preserved as-is: all `ruyin.ai` / `*.ruyin.ai` domain values and URL strings.

OIDC note: `OIDC_CLIENT_ID=umbra` and scope `umbra` are in `.env.example` and code,
but the IdP registration on `accounts.vxture.com` still uses `ruyin` until manually
updated there (out-of-band, not done in PR #169).

## Website homepage exception

`portals/website/lib/brand.ts` overrides `productName: "Ruyin"` so end users at
`ruyin.ai` continue to see "Ruyin" / "Ruyin Agent". Internally,
`umbraBrandCore.productName` is `"Umbra"` (used by admin/console portals).

## DS brand CSS

`@vxture/design-system/styles/brands/ruyin.css` is the actual published file name.
The three portal `layout.tsx` files import `ruyin.css` (not `umbra.css`) until the
DS package ships a `brands/umbra.css` export. Guardrail `09-check-ds-usage.py`
checks for `ruyin.css` accordingly.

## CI gotchas from this rename

- PowerShell `[System.Text.Encoding]::UTF8` writes UTF-8 WITH BOM; the ASCII
  contract check rejects the BOM (U+FEFF). Use
  `New-Object System.Text.UTF8Encoding($false)` for BOM-free output.
- Design system package exports must not be renamed in code without updating
  the package itself first (or simultaneously).
