# Umbra — Bug Fixes & Issue Tracker

Issues discovered during test deployment on vxture-worker-03 (45.77.20.55).
Goal: one-click deploy that works end-to-end without manual intervention.

---

## Fixed

### F-01 — Console auth bypass via `return 301`
**File:** `configs/nginx/vhosts/05-console.conf.template`
**Symptom:** verify step reported console returning 301 instead of 401/403; unauthenticated access possible.
**Cause:** `location = / { return 301 /dashboard/; }` runs in nginx rewrite phase, before `auth_basic` (access phase) — auth never executed.
**Fix:** Removed the redirect location block; used `proxy_redirect` instead to rewrite Marzban's Location headers.
**Commit:** `6629b2b`

---

### F-02 — Marzban API verify endpoint returning 404
**File:** `scripts/steps/06-verify.sh`
**Symptom:** verify step flagged Marzban API as failing.
**Cause:** `/api/core/stats` does not exist in current Marzban version.
**Fix:** Changed verify endpoint to `/api/inbounds` which returns 401 (unauthenticated) — proves service is running.
**Commit:** `6629b2b`

---

### F-03 — Marzban admin creation unreliable
**File:** `scripts/deploy-post.sh`
**Symptom:** API auth failed with 401 — admin user not created.
**Cause:** `SUDO_USERNAME`/`SUDO_PASSWORD` env vars only create the admin on first startup with an empty DB; unreliable across Marzban versions.
**Fix:** Added explicit Python + passlib admin creation step before API auth. Reads DB directly, inserts admin if not present. Idempotent.
**Commit:** `bb49cf3`

---

### F-04 — Marzban binds to 127.0.0.1, nginx gets 502
**Files:** `docker-compose.yml`, `scripts/steps/05-up.sh`
**Symptom:** nginx returned 502 for all Marzban routes.
**Cause:** Newer Marzban versions force `UVICORN_HOST=127.0.0.1` when no SSL cert is provided, making it unreachable from other Docker containers.
**Fix:**
- `05-up.sh`: copy the LE cert issued in step 03 to `DATA_DIR/marzban/tls/` before docker compose up.
- `docker-compose.yml`: set `UVICORN_SSL_CERTFILE` / `UVICORN_SSL_KEYFILE` pointing to the copied cert.
- nginx vhosts: changed `proxy_pass http://` → `proxy_pass https://` with `proxy_ssl_verify off`.
**Note:** Self-signed certs are rejected by Marzban's `validate_cert_and_key()` — must use the LE cert.
**Commit:** `6629b2b`

---

### F-05 — nginx startup fails when Marzban not yet running
**File:** `docker-compose.yml`
**Symptom:** nginx container exited unhealthy on first start.
**Cause:** nginx stream config resolves `umbra-marzban:10443` at startup; if Marzban isn't up yet, DNS resolution fails.
**Fix:** Added `depends_on: [umbra-marzban, umbra-vaultwarden, umbra-portal]` to the nginx service.
**Commit:** `6629b2b`

---

### F-06 — Console login "flash and reappear" — auth_basic conflicts with Bearer token
**File:** `configs/nginx/vhosts/05-console.conf.template`
**Symptom:** Login form accepted credentials, then immediately reappeared with no error message.
**Cause:** `auth_basic` at nginx server block level intercepts ALL requests, including Marzban API calls. After login, React sends `Authorization: Bearer <token>`; nginx rejects it (expects Basic) and returns 401; Marzban JS interprets this as an auth failure and redirects back to the login page.
**Fix:** Removed `auth_basic` and `auth_basic_user_file` from the console vhost. Marzban handles its own JWT authentication.
**Commit:** `b8f6ec2`

---

## Fixed (continued)

### F-07 — VPN connections timeout — xray rejects PROXY protocol header
**File:** `configs/xray/config.json.template`
**Symptom:** Subscription URLs import successfully; connecting to VPN times out.
**Cause:** nginx stream config has `proxy_protocol on`, which prepends a PROXY protocol header to every connection forwarded to xray. The xray inbound was missing `sockopt.acceptProxyProtocol: true`, so xray received the PROXY header bytes instead of a TLS ClientHello and failed the handshake silently.
**Fix:** Added `"sockopt": { "acceptProxyProtocol": true }` to the xray inbound `streamSettings`.
**Verification:** stream.conf routing confirmed correct; REALITY_SNI matches xray serverNames; Marzban/xray started cleanly.
**Commit:** pending

---

## Miscellaneous Notes

- `apt upgrade -y` in cloud-init scripts blocks on interactive prompts; use `DEBIAN_FRONTEND=noninteractive`.
- `$DATA_DIR` is not exported to the login shell; always source `scripts/lib/env.sh` or use absolute paths.
- WordPress bots scan the console endpoint — expected noise, no action needed.
- Two subscription URL tokens exist for user01 (old token from pre-fix run, new token from current DB). Use the URL shown in the Marzban console panel — it reflects the current active record.
