---
name: memory-versioning-preference
description: "How the user wants Claude's memory store versioned and pushed"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a24b8b4e-44c5-4c64-bea4-f7f29f002361
---

The user wants the Claude memory store versioned **inside the existing
`vxture/umbra` GitHub repo**, not in a separate/new repository. Goal: full
version unification with local and remote in exact agreement.

**Why:** they treat a consistent, single-remote repo as the foundation for
ongoing development; spinning up a standalone repo for memory was explicitly
rejected ("要创建新repo？").

**How to apply:** the memory folder at
`~/.claude/projects/D--MyWebSite-vxturestudio-umbra/memory/` is its own git repo
(it must stay at that path for the memory feature to read it). Point its
`origin` at `https://github.com/vxture/umbra.git` and push to a dedicated branch
`claude-memory`. Keep local branch == `origin/claude-memory`. Never propose
creating a new standalone GitHub repo for memory. See [[cicd-deploy-flow]] for
the project's main-repo branch rules.
