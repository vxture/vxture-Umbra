# Product Spec

Umbra is a single-node production VPN edge for the Ruyin service.

It provides:

- Public HTTPS entry for Ruyin landing and VPN portal pages.
- Marzban-managed VLESS + REALITY VPN access.
- Native Marzban subscription delivery at `/sub/<token>`.
- Marzban console protected by Marzban login.
- Vaultwarden password management at the password domain.
- File-based deployment state under `DATA_DIR`, with SQLite for Marzban and Vaultwarden.

It intentionally does not provide:

- A separate Xray container. Xray runs inside `umbra-marzban`.
- A custom subscription converter service.
- Public access to Marzban admin APIs.
- PostgreSQL or other external database services on the 1C1G node.

Human operators should primarily use the root `README.md`. This `docs/` tree is optimized for AI coding agents and maintainers.
