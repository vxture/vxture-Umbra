import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authBffUrl() {
  return (process.env.AUTH_BFF_URL || "").replace(/\/+$/, "");
}

function internalToken() {
  return process.env.AUTH_INTERNAL_TOKEN || "";
}

function appUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_RUYIN_ACCOUNT_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return `${request.nextUrl.protocol}//${request.nextUrl.host}`;
}

function readSetCookies(headers: Headers) {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  const values = extended.getSetCookie?.();
  if (values?.length) return values;
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const authUrl = authBffUrl();
  const authSecret = internalToken();
  const target = appUrl(request);

  if (!token || !authUrl || !authSecret) {
    return NextResponse.redirect(new URL("/?sso=missing", target));
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
    return NextResponse.redirect(new URL("/?sso=invalid", target));
  }

  const payload = (await verify.json().catch(() => ({}))) as {
    sub?: string;
    tenantId?: string;
  };

  const sign = await fetch(`${authUrl}/auth/internal/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-vxture-internal-auth": authSecret,
    },
    body: JSON.stringify({
      sub: payload.sub,
      email: "",
      role: "member",
      source: "ruyin",
      tenantId: payload.tenantId,
    }),
    cache: "no-store",
  });

  if (!sign.ok) {
    return NextResponse.redirect(new URL("/?sso=failed", target));
  }

  const response = NextResponse.redirect(new URL("/dashboard", target));
  for (const cookie of readSetCookies(sign.headers)) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
