/**
 * Allowlist for the post-login landing URL. Permits the request's own host
 * (dev/localhost) and the configured first-party zone (apex + any subdomain of
 * the RP session cookie domain). Anything else is rejected to prevent an open
 * redirect.
 */
import type { NextRequest } from "next/server";
import type { OidcConfig } from "./config";

export function safeReturnTo(raw: string | null, request: NextRequest, cfg: OidcConfig): string {
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && cfg.isProd) return "";
  const apex = cfg.cookieDomain.replace(/^\./, "").trim();
  const host = url.hostname;
  if (host === request.nextUrl.hostname) return url.toString();
  if (apex && (host === apex || host.endsWith(`.${apex}`))) return url.toString();
  return "";
}
