# Repository Implementation

Current top-level layout:

```text
umbra/
|-- .env.example
|-- docker-compose.yml
|-- README.md
|-- configs/
|-- docs/
|-- landing/
|-- portal/
`-- scripts/
```

Key implementation paths:

| Path | Purpose |
|---|---|
| `configs/nginx/nginx.conf` | Main nginx config copied to `DATA_DIR/nginx/nginx.conf` |
| `configs/nginx/stream.conf.template` | SNI routing rendered to `DATA_DIR/nginx/stream.d/stream.conf` |
| `configs/nginx/vhosts/*.conf.template` | HTTPS virtual hosts rendered to `DATA_DIR/nginx/conf.d/` |
| `configs/nginx/snippets/*.conf` | Shared nginx snippets copied to `DATA_DIR/nginx/snippets/` |
| `configs/xray/config.json.template` | Marzban-managed Xray config rendered to `DATA_DIR/marzban/xray_config.json` |
| `configs/marzban/clash-subscription.j2` | Marzban Clash template rendered to `DATA_DIR/marzban/templates/clash/default.yml` |
| `landing/html/` | Source for `ruyin.ai` and `www.ruyin.ai` static pages |
| `portal/html/` | Source for the VPN portal container |
| `scripts/server/` | Server lifecycle implementation |
| `scripts/deploy/` | Deploy pipeline implementation |
| `scripts/ops/` | Runtime operations implementation |
| `scripts/lib/` | Shared shell helpers |

Avoid adding generated files, runtime data, certificates, SQLite databases, or server backups to the repo.
