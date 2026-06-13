import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "umbra_sso_state";
const PENDING_INVITE_COOKIE = "umbra_pending_invite";
const RETURN_COOKIE = "umbra_sso_return";
const INVITE_RE = /^[A-Za-z0-9-]{1,64}$/;

function appUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_RUYIN_ACCOUNT_URL;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

function ssoUrl() {
  return process.env.VXTURE_SSO_URL || "";
}

/**
 * Where to send the browser AFTER our callback completes. Allowlisted to the
 * ruyin.ai apex + any *.ruyin.ai app (the unified-session domain) and to the
 * request's own host (dev/localhost). Anything else is rejected to prevent an
 * open redirect. Distinct from ctx.returnTo, which is the SSO -> our-callback URL.
 */
function safeReturnTo(raw: string | null, request: NextRequest): string {
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") return "";
  const apex = (process.env.RUYIN_COOKIE_DOMAIN || "").trim();
  const host = url.hostname;
  if (host === request.nextUrl.hostname) return url.toString();
  if (apex && (host === apex || host.endsWith(`.${apex}`))) return url.toString();
  return "";
}

export async function GET(request: NextRequest) {
  const configured = ssoUrl();
  const target = appUrl(request);

  if (!target) {
    return new NextResponse("Ruyin account URL is not configured", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!configured) {
    return NextResponse.redirect(new URL("/?sso=disabled", target));
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    return NextResponse.redirect(new URL("/?sso=bad_config", target));
  }

  const state = crypto.randomUUID();
  const ctx: Record<string, string> = {
    from: "ruyin",
    returnTo: `${target}/auth/callback`,
    caller: "Ruyin",
    state,
  };

  // Forward the registration vs login intent so the account center can open the
  // right screen (graceful: ignored upstream until accounts.vxture.com honors it).
  const hint = request.nextUrl.searchParams.get("screen_hint");
  if (hint === "signup" || hint === "login") {
    ctx.screenHint = hint;
  }

  url.searchParams.set("ctx", JSON.stringify(ctx));

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/auth",
    maxAge: 300,
  });

  const finalReturn = safeReturnTo(request.nextUrl.searchParams.get("returnTo"), request);
  if (finalReturn) {
    response.cookies.set(RETURN_COOKIE, finalReturn, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth",
      maxAge: 600,
    });
  }

  const invite = request.nextUrl.searchParams.get("invite");
  if (invite && INVITE_RE.test(invite)) {
    response.cookies.set(PENDING_INVITE_COOKIE, invite, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/auth",
      maxAge: 600,
    });
  }
  return response;
}
