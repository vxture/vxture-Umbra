import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "umbra_sso_state";
const PENDING_INVITE_COOKIE = "umbra_pending_invite";
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
  const ctx = {
    from: "ruyin",
    returnTo: `${target}/auth/callback`,
    caller: "Ruyin",
    state,
  };

  url.searchParams.set("ctx", JSON.stringify(ctx));

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/auth",
    maxAge: 300,
  });

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
