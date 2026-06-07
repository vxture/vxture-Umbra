# Memory Versioning Preference (memory mirror)

> Mirror of memory `memory-versioning-preference` (type: feedback). Describes how
> the maintainer wants Claude's memory store versioned.

The Claude memory store is versioned **inside the existing `vxture/umbra` GitHub
repo**, not in a separate or new repository. Goal: full version unification with
local and remote in exact agreement.

**Why:** the maintainer treats a consistent, single-remote repo as the foundation
for ongoing development; spinning up a standalone repo for memory was explicitly
rejected.

**How to apply:**
- The live memory folder at
  `~/.claude/projects/D--MyWebSite-vxturestudio-umbra/memory/` is its own git repo
  (it must stay at that path so the memory feature can read it).
- Its `origin` points at `https://github.com/vxture/umbra.git`, pushed to the
  dedicated `claude-memory` branch; local branch tracks `origin/claude-memory`.
- This [`docs/memory/`](README.md) tree is the human-readable mirror that travels
  with the codebase on `develop`/`main`.
- Never propose creating a new standalone GitHub repo for memory.

## Two synced locations

Every memory edit should reach both:

1. **Live store** `~/.claude/.../memory/` -> git repo on branch `claude-memory`
   of `vxture/umbra`. This is what the memory feature reads. Files keep YAML
   frontmatter.
2. **Docs mirror** `docs/memory/` in the umbra working tree, on `develop`/`main`,
   indexed by [`../agent.md`](../agent.md). Human-readable, project-facing. Files
   drop frontmatter for a `#` title and carry a "(memory mirror)" suffix.

## Sync flow when memory changes

1. Edit/add the file in the live store, then in that folder:
   `git add -A && git commit && git push origin claude-memory`
   (also update its `MEMORY.md` index).
2. Mirror the same change into `docs/memory/<name>.md`; if the memory is new, add
   a row to the [`../agent.md`](../agent.md) Document Map. Mirrors must be **ASCII
   English** (build constraint #13 / CI `Static script checks`), use repo-relative
   links, and keep the header note pointing to the authoritative
   `specs/`/`design/`/`operations/` doc ("authoritative doc wins").
3. Ship the `docs/memory/` change through the normal branch flow: feature branch
   off `origin/develop` -> PR -> CI -> squash-merge -> promote to `main`. Never
   edit `docs/memory/` directly on `develop`/`main`.

See [`cicd-deploy-flow.md`](cicd-deploy-flow.md) for the main-repo branch rules.
