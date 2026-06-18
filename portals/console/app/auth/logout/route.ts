import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig } from "../lib/config";
import { destroySession } from "../lib/session-store";
import { clearSessionCookie } from "../lib/cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Local (ruyin-only) logout. Destroys this RP session and clears the opaque
 * cookie, then redirects to the ruyin home. It deliberately does NOT call the
 * IdP end_session endpoint, so the central vx_sid session and other apps stay
 * signed in. Consequence: the next ruyin login is silent (the IdP re-issues a
 * code from the live central session without a prompt) - the expected semantics
 * of "log out of this app only". Global logout still reaches ruyin inbound via
 * /auth/backchannel-logout.
 *
 * Accepts both GET and POST so the UI can sign out with a plain top-level
 * navigation (reliable from inside a popover menu, where a programmatic
 * form.submit() races the menu unmount). GET logout only ends the local session
 * (low-risk if triggered cross-site - at worst an unwanted sign-out).
 */
async function handleLogout(request: NextRequest): Promise<NextResponse> {
  const cfg = getOidcConfig();
  if (!cfg) {
    return new NextResponse("OIDC RP is not configured", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const rpsid = request.cookies.get(cfg.cookieName)?.value;
  if (rpsid) await destroySession(cfg, rpsid);

  // Land on the ruyin first-party zone (apex home), never the IdP.
  const apex = cfg.cookieDomain.replace(/^\./, "").trim();
  const dest = apex ? `https://${apex}/` : new URL("/", request.nextUrl.origin).toString();
  const res = NextResponse.redirect(dest, { status: 303 });
  clearSessionCookie(res, cfg);
  return res;
}

export function GET(request: NextRequest) {
  return handleLogout(request);
}

export function POST(request: NextRequest) {
  return handleLogout(request);
}
