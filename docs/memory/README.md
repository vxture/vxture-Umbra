# Memory (pointer)

Claude Code's persistent project memory does NOT live here. It lives in two
places, both outside this `docs/` tree:

- Live store: `~/.claude/projects/D--MyWebSite-vxturestudio-umbra/memory/`
  (loaded by AI assistants across sessions; `MEMORY.md` is its index).
- Versioned copy: the same store is a git repo whose `origin` is `vxture/vxture-Umbra`,
  pushed to the dedicated `claude-memory` branch (NOT merged into
  `develop`/`main`).

Selective mirrors of memory entries that record facts not covered by any
authoritative product doc (one-time events, cross-cutting renames, CI gotchas)
are kept here as ASCII English `.md` files. Facts already authoritative in
`design/`, `implementation/`, `operations/`, `deployment/`, or `specs/` are NOT
duplicated here.

| Mirror file | Subject |
|---|---|
| [`repo-brand-rename.md`](repo-brand-rename.md) | GitHub rename vxture/umbra -> vxture/vxture-Umbra + ruyin->umbra brand rename (2026-07-07) |

When a mirror and an authoritative doc disagree, the authoritative doc wins.
