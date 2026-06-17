/**
 * The opaque RP session cookie. It carries only the random rpsid (a pointer to
 * the server-side session); no tokens or claims live in the browser. Scoped to
 * the configured first-party zone (e.g. .ruyin.ai) so one login covers apex +
 * every *.ruyin.ai app; host-only when no domain is configured (dev).
 */
import type { NextResponse } from "next/server";
import type { OidcConfig } from "./config";

export function setSessionCookie(res: NextResponse, cfg: OidcConfig, rpsid: string): void {
  res.cookies.set({
    name: cfg.cookieName,
    value: rpsid,
    httpOnly: true,
    secure: cfg.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: cfg.sessionTtlSeconds,
    domain: cfg.cookieDomain || undefined,
  });
}

export function clearSessionCookie(res: NextResponse, cfg: OidcConfig): void {
  res.cookies.set({
    name: cfg.cookieName,
    value: "",
    httpOnly: true,
    secure: cfg.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    domain: cfg.cookieDomain || undefined,
  });
}
