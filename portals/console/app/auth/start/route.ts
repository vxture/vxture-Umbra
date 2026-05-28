import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATE_COOKIE = "umbra_sso_state";

function appUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_RUYIN_ACCOUNT_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

function ssoUrl() {
  return process.env.VXTURE_SSO_URL || "";
}

export async function GET(request: NextRequest) {
  const configured = ssoUrl();
  const target = appUrl(request);

  if (!configured) {
    return NextResponse.redirect(new URL("/?sso=disabled", target));
  }

  const state = crypto.randomUUID();
  const ctx = {
    from: "ruyin",
    returnTo: `${target}/auth/callback`,
    caller: "Ruyin",
    state,
  };

  const url = new URL(configured);
  url.searchParams.set("ctx", JSON.stringify(ctx));

  const response = NextResponse.redirect(url);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/auth",
    maxAge: 300,
  });
  return response;
}
