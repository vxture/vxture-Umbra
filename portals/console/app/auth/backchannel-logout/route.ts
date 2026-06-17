import { NextRequest, NextResponse } from "next/server";
import { getOidcConfig } from "../lib/config";
import { verifyToken } from "../lib/oidc";
import { destroyBySid } from "../lib/session-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKCHANNEL_EVENT = "http://schemas.openid.net/event/backchannel-logout";

/**
 * Back-channel logout receiver (standard section 8) - the only way a global
 * logout can reach a cross-domain app whose RP cookie is host-scoped. Verifies
 * the logout_token (RS256/iss/aud/exp), requires the backchannel-logout event +
 * sid and forbids nonce, then destroys every RP session for that central sid.
 * Best-effort: always returns 200 once the token is valid.
 */
export async function POST(request: NextRequest) {
  const cfg = getOidcConfig();
  if (!cfg) return new NextResponse(null, { status: 501 });

  let logoutToken: string | null = null;
  try {
    const form = await request.formData();
    const value = form.get("logout_token");
    logoutToken = typeof value === "string" ? value : null;
  } catch {
    logoutToken = null;
  }
  if (!logoutToken) return new NextResponse("missing logout_token", { status: 400 });

  let sid: string;
  try {
    const claims = await verifyToken(cfg, logoutToken);
    if (typeof claims.nonce !== "undefined") throw new Error("logout_token must not carry nonce");
    const events = claims.events as Record<string, unknown> | undefined;
    if (!events || typeof events[BACKCHANNEL_EVENT] !== "object") {
      throw new Error("missing backchannel-logout event");
    }
    if (typeof claims.sid !== "string" || !claims.sid) throw new Error("missing sid");
    sid = claims.sid;
  } catch {
    return new NextResponse("invalid logout_token", { status: 400 });
  }

  await destroyBySid(cfg, sid);
  return new NextResponse(null, { status: 200 });
}
