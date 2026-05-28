# Vxture SSO Integration Design

This document defines the SSO handoff between Umbra/Ruyin and the Vxture
console.

## Status

Umbra already has:

- A Next.js account web app on `https://vpn.ruyin.ai`.
- An invite console on `https://console.ruyin.ai/invites`.
- A server callback route at `GET /auth/callback`.
- Account APIs that can read the Vxture access cookie and bind it to an
  existing Marzban invite.

Until the Vxture SSO endpoint is available, keep:

```env
VXTURE_SSO_URL=
```

After Vxture publishes the endpoint, set:

```env
VXTURE_SSO_URL=https://console.vxture.com/zh-CN/sso/start
```

## Goals

- Let a user start login from `vpn.ruyin.ai`.
- Redirect the user to Vxture SSO with a structured `ctx` parameter.
- Receive a cross-domain token from Vxture at the Umbra callback route.
- Exchange the cross-domain token for normal Vxture auth cookies.
- Redirect the user to the logged-in Umbra account page.
- Protect the callback against CSRF with a server-generated `state`.

## Non-Goals

- Do not implement a separate Umbra identity provider.
- Do not store Vxture passwords in Umbra.
- Do not expose `AUTH_INTERNAL_TOKEN` or auth-bff credentials to the browser.
- Do not depend on client-side state storage for CSRF protection.

## Public Contract

### Start URL

Umbra should start SSO through a server route:

```text
GET https://vpn.ruyin.ai/auth/start
```

The route redirects to:

```text
https://console.vxture.com/zh-CN/sso/start?ctx=<json>
```

The `ctx` JSON object:

```json
{
  "from": "ruyin",
  "returnTo": "https://vpn.ruyin.ai/auth/callback",
  "caller": "Ruyin",
  "state": "<uuid>"
}
```

Notes:

- Umbra should send only `ctx`; it should not append a separate `returnTo`
  query parameter.
- `state` is generated server-side by Umbra.
- `ctx` is JSON-stringified and URL-encoded as the `ctx` query parameter.

### Callback URL

Vxture redirects back to:

```text
GET https://vpn.ruyin.ai/auth/callback?token=<token>&state=<state>
```

The callback route must:

1. Validate `state` if Umbra SSO state protection is enabled.
2. Call `AUTH_BFF_URL/auth/crossdomain/verify` with the received token.
3. Call `AUTH_BFF_URL/auth/internal/sign` after token verification.
4. Forward every returned `Set-Cookie` header to the browser.
5. Redirect to `/dashboard`.

## Server-Side State Design

`/auth/start` must:

1. Generate a cryptographically random UUID state.
2. Store the state in a short-lived HttpOnly cookie.
3. Build the `ctx` object.
4. Redirect to `VXTURE_SSO_URL` with `ctx`.

Recommended cookie:

```text
Name: umbra_sso_state
HttpOnly: true
Secure: true
SameSite: Lax
Path: /auth
Max-Age: 300
```

`/auth/callback` must:

1. Read `state` from the query string.
2. Read `umbra_sso_state` from the request cookie.
3. Compare both values with a constant-time comparison.
4. Clear `umbra_sso_state` after validation, including failure cases.
5. Reject the request before token exchange if state validation fails.

Failure response:

```text
HTTP 302 Location: /login?error=sso_state
```

## Environment Variables

Umbra console portal:

```env
VXTURE_SSO_URL=https://console.vxture.com/zh-CN/sso/start
AUTH_BFF_URL=<vxture-auth-bff-origin>
AUTH_INTERNAL_TOKEN=<internal-sign-token>
NEXT_PUBLIC_RUYIN_ACCOUNT_URL=https://vpn.ruyin.ai
```

Umbra account API:

```env
JWT_SECRET=<same-secret-used-for-ry_access_token>
VXTURE_LOGIN_URL=https://console.vxture.com/zh-CN/signin
VXTURE_SSO_URL=https://console.vxture.com/zh-CN/sso/start
```

Current deployment may keep `VXTURE_SSO_URL` empty until the Vxture endpoint is
ready.

## Sequence

```text
Browser
  -> GET vpn.ruyin.ai/auth/start

Umbra account web
  -> generate state
  -> Set-Cookie: umbra_sso_state=<state>; HttpOnly; Secure; SameSite=Lax
  -> 302 VXTURE_SSO_URL?ctx=<json>

Browser
  -> GET console.vxture.com/zh-CN/sso/start?ctx=<json>

Vxture SSO
  -> authenticate user if needed
  -> issue cross-domain token
  -> 302 https://vpn.ruyin.ai/auth/callback?token=<token>&state=<state>

Umbra account web
  -> validate state cookie
  -> POST AUTH_BFF_URL/auth/crossdomain/verify
  -> POST AUTH_BFF_URL/auth/internal/sign
  -> forward Set-Cookie
  -> 302 /dashboard
```

## Implemented Umbra Behavior

1. `GET /auth/start` is a server route in `portals/console`.
2. The login button links to `/auth/start` when `VXTURE_SSO_URL` is configured.
3. The login button falls back to `VXTURE_LOGIN_URL` while `VXTURE_SSO_URL` is
   empty.
4. `GET /auth/callback` validates the state cookie before token exchange.
5. `GET /auth/callback` clears the state cookie after callback handling.

## Acceptance Criteria

- With `VXTURE_SSO_URL=` empty, existing login behavior remains unchanged.
- With `VXTURE_SSO_URL` configured, the login button sends users through
  `/auth/start`, not directly to Vxture from client code.
- `/auth/start` redirects to Vxture with exactly one `ctx` parameter.
- `/auth/callback` rejects missing or mismatched `state`.
- `/auth/callback` verifies the cross-domain token before signing cookies.
- The browser receives Vxture auth cookies and lands on `/dashboard`.
- `AUTH_INTERNAL_TOKEN` is never exposed to client JavaScript.

## Open Questions

- Confirm whether Vxture expects `ctx` as raw JSON URL-encoded by
  `URLSearchParams`, or base64url-encoded JSON.
- Confirm whether Vxture returns `state` as a top-level query parameter exactly
  named `state`.
- Confirm whether Vxture requires any fixed allowed origin or caller registry
  for `from: "ruyin"`.
