# Memory (pointer)

Claude Code's persistent project memory does NOT live here. It lives in two
places, both outside this `docs/` tree:

- Live store: `~/.claude/projects/D--MyWebSite-vxturestudio-umbra/memory/`
  (loaded by AI assistants across sessions; `MEMORY.md` is its index).
- Versioned copy: the same store is a git repo whose `origin` is `vxture/vxture-Umbra`,
  pushed to the dedicated `claude-memory` branch (NOT merged into
  `develop`/`main`).

This folder previously held a hand-maintained mirror of those memory files. The
mirror was removed because it duplicated content that is already authoritative in
the product docs and drifted out of sync. For durable project facts, read the
authoritative docs directly:

- Architecture / decisions: `../design/`
- Deploy scripts and config rendering: `../implementation/`
- Deploy/ops runbooks and CI/CD: `../operations/`, `../deployment/`
- Product / domains / security: `../specs/`

When memory and an authoritative doc disagree, the authoritative doc wins.
