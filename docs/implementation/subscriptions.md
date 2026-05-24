# Subscription Implementation

Subscriptions must remain Marzban-native.

## Public URL

The public URL format is:

```text
https://sub.ruyin.ai/sub/<marzban-token>
```

Do not rewrite public URLs to `/clash-meta`, `/v2ray`, username-based tokens, or custom converter paths.

## nginx Boundary

`configs/nginx/vhosts/04-sub.conf.template` exposes only:

```text
GET /sub/<token>
```

Everything else returns `404`, including:

```text
/
/sub
/sub/
/sub/<token>/clash-meta
```

## Marzban Token Behavior

Marzban may display a fresh-looking subscription token after a console refresh. That does not imply a user changed. Old saved tokens can remain valid while GET returns `200`.

Use GET for verification:

```bash
curl -sk -o /tmp/sub.yaml -w "%{http_code}\n" 'https://sub.ruyin.ai/sub/<token>'
```

Do not use HEAD as the success test; Marzban can return `405 Method Not Allowed`.

## Clash Template

Source:

```text
configs/marzban/clash-subscription.j2
```

Rendered output:

```text
DATA_DIR/marzban/templates/clash/default.yml
```

The Clash profile title is set in the subscription file header:

```yaml
#profile-title: Ruyin-{{ user.username | upper }}
```

For `USER01`, clients should display:

```text
Ruyin-USER01
```

Proxy node names remain controlled by Marzban and `NODE_NAME`.
