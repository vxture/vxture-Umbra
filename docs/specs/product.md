# Product Spec

Umbra is a single-node production VPN edge for the Ruyin service.

It provides:

- Public HTTPS entry for Ruyin landing and the invite-bound account portal.
- Marzban-managed VLESS + REALITY VPN access.
- Native Marzban subscription delivery at `/sub/<token>`.
- Subscription metadata normalization so clients display `Ruyin-USERNAME`.
- Marzban console protected by Marzban login.
- Invite management at `admin.ruyin.ai/invites` for binding existing Marzban users to console logins.
- Vaultwarden password management at the password domain.
- File-based deployment state under `DATA_DIR`, with SQLite for Marzban, Account Portal, and Vaultwarden.

It intentionally does not provide:

- A separate Xray container. Xray runs inside `umbra-marzban`.
- A custom subscription converter service; `umbra-subproxy` only normalizes response metadata.
- Public access to Marzban admin APIs.
- PostgreSQL or other external database services on the 1C1G node.

Human operators should primarily use the root `README.md`. This `docs/` tree is optimized for AI coding agents and maintainers.
