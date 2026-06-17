import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig } from "../lib/config";
import { buildEndSessionUrl } from "../lib/oidc";
import { randomToken } from "../lib/pkce";
import { destroySession } from "../lib/session-store";
import { clearSessionCookie } from "../lib/cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Local logout + global SLO trigger. Destroys this RP session, clears the
 * opaque cookie, then top-level redirects to the IdP end_session endpoint so the
 * central session and every other RP are torn down (303 so the POST becomes a
 * GET navigation).
 */
export async function POST(request: NextRequest) {
  const cfg = getOidcConfig();
  if (!cfg) {
    return new NextResponse("OIDC RP is not configured", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const rpsid = request.cookies.get(cfg.cookieName)?.value;
  if (rpsid) await destroySession(cfg, rpsid);

  const res = NextResponse.redirect(buildEndSessionUrl(cfg, randomToken(16)), { status: 303 });
  clearSessionCookie(res, cfg);
  return res;
}
