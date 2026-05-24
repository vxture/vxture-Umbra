# Config Rendering

`scripts/deploy/04-render-configs.py` is the only config renderer.

Run it with Python:

```bash
python3 scripts/deploy/04-render-configs.py
```

Do not run it with `bash`.

## Inputs

- `.env`
- `DATA_DIR/private/reality.json`
- templates and static files under `configs/`, `landing/`, and `portal/`
- static assets under `landing/html/assets/` are deployed with the landing page

## Template Syntax

Only `{{ SCREAMING_SNAKE_CASE }}` variables are rendered by `04-render-configs.py`.

Lowercase or mixed-case Jinja variables are intentionally left for Marzban's second-stage template rendering. Example:

```jinja2
{{ conf | only("proxies") | yaml }}
{{ user.username | upper }}
```

## Outputs

| Source | Output |
|---|---|
| `configs/nginx/nginx.conf` | `DATA_DIR/nginx/nginx.conf` |
| `configs/nginx/stream.conf.template` | `DATA_DIR/nginx/stream.d/stream.conf` |
| `configs/nginx/vhosts/*.conf.template` | `DATA_DIR/nginx/conf.d/*.conf` |
| `configs/nginx/snippets/*.conf` | `DATA_DIR/nginx/snippets/*.conf` |
| `configs/xray/config.json.template` | `DATA_DIR/marzban/xray_config.json` |
| `configs/marzban/clash-subscription.j2` | `DATA_DIR/marzban/templates/clash/default.yml` |
| `landing/html/**` | `DATA_DIR/nginx/html/ruyin-landing/` and `DATA_DIR/nginx/html/www-ruyin/` |
| `portal/html/**` | `DATA_DIR/portal/html/` |

## Landing Assets

Landing page images live under `landing/html/assets/`.

Use relative URLs from `landing/html/index.html`, for example:

```html
<img src="assets/brand/ruyin-dark.png" alt="">
```
