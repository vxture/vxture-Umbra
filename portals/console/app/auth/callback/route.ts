import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "umbra_sso_state";
const PENDING_INVITE_COOKIE = "umbra_pending_invite";
const RETURN_COOKIE = "umbra_sso_return";
const INVITE_RE = /^[A-Za-z0-9-]{1,64}$/;
const ACCESS_COOKIE = process.env.VXTURE_COOKIE_ACCESS || "ry_access_token";
const COOKIE_DOMAIN = (process.env.RUYIN_COOKIE_DOMAIN || "").trim();

function authBffUrl() {
  return (process.env.AUTH_BFF_URL || "").replace(/\/+$/, "");
}

function internalToken() {
  return process.env.AUTH_INTERNAL_TOKEN || "";
}

function appUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_RUYIN_ACCOUNT_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

function readSetCookies(headers: Headers) {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  const values = extended.getSetCookie?.();
  if (values?.length) return values;
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

/**
 * Rewrite the session access cookie onto the shared parent domain so one login
 * is valid across ruyin.ai and every *.ruyin.ai app. Other cookies pass through
 * untouched.
 */
function withSharedDomain(setCookie: string): string {
  if (!COOKIE_DOMAIN) return setCookie;
  const name = setCookie.split("=")[0]?.trim();
  if (name !== ACCESS_COOKIE) return setCookie;
  const stripped = setCookie.replace(/;\s*Domain=[^;]*/gi, "");
  return `${stripped}; Domain=${COOKIE_DOMAIN}`;
}

function stateMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function redirectClearingState(path: string, target: string) {
  const response = NextResponse.redirect(new URL(path, target));
  response.cookies.delete({
    name: STATE_COOKIE,
    path: "/auth",
  });
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/auth",
    maxAge: 0,
  });
  return response;
}

/**
 * Failure landing: the public marketing apex (anonymous, never auto-redirects),
 * so a failed/cancelled sign-in cannot bounce back into an auto-redirecting app
 * and loop. Falls back to the console origin only when no apex is configured.
 */
function failTarget(reason: string, target: string) {
  const dest = COOKIE_DOMAIN
    ? `https://${COOKIE_DOMAIN}/?sso=${encodeURIComponent(reason)}`
    : `/?sso=${encodeURIComponent(reason)}`;
  return redirectClearingState(dest, target);
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const authUrl = authBffUrl();
  const authSecret = internalToken();
  const target = appUrl(request);

  if (!target) {
    return new NextResponse("Ruyin account URL is not configured", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!stateMatches(state, expectedState)) {
    return failTarget("state", target);
  }

  if (error) {
    return failTarget(error, target);
  }

  if (!token || !authUrl || !authSecret) {
    return failTarget("missing", target);
  }

  const verify = await fetch(`${authUrl}/auth/crossdomain/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vxture-internal-auth": authSecret,
    },
    body: JSON.stringify({ token, source: "ruyin.ai" }),
    cache: "no-store",
  });

  if (!verify.ok) {
    return failTarget("invalid", target);
  }

  const payload = (await verify.json().catch(() => ({}))) as {
    sub?: string;
    tenantId?: string;
    email?: string;
    role?: string;
  };

  const sign = await fetch(`${authUrl}/auth/internal/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vxture-internal-auth": authSecret,
    },
    body: JSON.stringify({
      sub: payload.sub,
      email: payload.email ?? "",
      role: payload.role ?? "member",
      source: "ruyin",
      tenantId: payload.tenantId,
    }),
    cache: "no-store",
  });

  if (!sign.ok) {
    return failTarget("failed", target);
  }

  const pendingInvite = request.cookies.get(PENDING_INVITE_COOKIE)?.value;
  const validInvite = pendingInvite && INVITE_RE.test(pendingInvite) ? pendingInvite : null;
  const finalReturn = request.cookies.get(RETURN_COOKIE)?.value || "";
  // An invite must be bound inside the console; otherwise honor the caller's
  // returnTo (e.g. back to ruyin.ai), defaulting to the console home.
  const destination = validInvite
    ? `/register?invite=${encodeURIComponent(validInvite)}`
    : finalReturn || "/";

  const response = redirectClearingState(destination, target);
  for (const name of [PENDING_INVITE_COOKIE, RETURN_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth",
      maxAge: 0,
    });
  }
  for (const cookie of readSetCookies(sign.headers)) {
    response.headers.append("set-cookie", withSharedDomain(cookie));
  }
  return response;
}
