---
name: clash-rule-ipcidr-only
description: Marzban must-direct rules only accept IP-CIDR (IPv6 too); IP-CIDR6 aborts deploy
metadata: 
  node_type: memory
  type: project
  originSessionId: 7c823f24-100c-4843-bd9d-a21f8ad95d6a
---

The Marzban Clash must-direct ruleset (`configs/marzban/must-direct-rules.txt`,
format `TYPE,VALUE` rendered to `- TYPE,VALUE,DIRECT`) supports exactly three
rule types: `DOMAIN`, `DOMAIN-SUFFIX`, `IP-CIDR`. There is NO `IP-CIDR6`.

Both the deploy-time renderer (`deploy/worker-03/scripts/22-render-runtime-configs.py`)
and the contract validator (`deploy/worker-03/scripts/19-check-clash-rules.py`)
hard-reject any other type with `[ERROR] Invalid Clash direct rule: ...` and
abort config rendering -> the `deploy-worker-03` job fails. IPv6 prefixes are
fine, just use `IP-CIDR` for them (values are parsed via
`ipaddress.ip_network(strict=False)`, which handles v4 and v6; Clash's IP-CIDR
already matches IPv6). The renderer appends `,no-resolve` to IP rules.

**Why:** Burned a full deploy cycle on 2026-06-11 (PR #55) adding Tailscale
IPv6 blocks as `IP-CIDR6`; renderer aborted on worker-03 after all 6 docker
builds passed. PR #56 fixed it by switching to `IP-CIDR`. The render aborts
BEFORE writing the live config, so a bad rule does not corrupt the running
config -- it just blocks the deploy.

**How to apply:** When editing must-direct-rules.txt, only ever use DOMAIN /
DOMAIN-SUFFIX / IP-CIDR. DOMAIN-SUFFIX covers apex + all subdomains (one
`tailscale.com` line covers controlplane/login/pkgs/derp/log subdomains).
Sanity-check IP values locally with `python -c "import ipaddress;
ipaddress.ip_network('VALUE', strict=False)"` before pushing. The validator
prints `[OK] Clash must-direct rules verified: N` on worker-03 -- N == every
rule present, DIRECT, and before the first PROXY/MATCH boundary.

Related: [[cicd-deploy-flow.md]], [[project-overview.md]].
