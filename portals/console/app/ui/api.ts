import type { SessionPayload } from "./types";

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    throw Object.assign(new Error("Request failed"), { payload, response });
  }
  return payload;
}

export function ssoStartUrl(_session: SessionPayload, invite?: string) {
  // OIDC RP login entry (server route generates PKCE+state+nonce, then top-level
  // redirects to accounts.vxture.com/oidc/authorize). Served same-origin on the
  // console (its catch-all proxies to umbra-account-web). The OIDC callback lands
  // on the apex (the registered redirect host), so pass returnTo = this console
  // URL (allowlisted to *.ruyin.ai) to come back here after sign-in.
  const params = new URLSearchParams();
  if (typeof window !== "undefined") params.set("returnTo", window.location.href);
  if (invite) params.set("invite", invite);
  const qs = params.toString();
  return qs ? `/auth/login?${qs}` : "/auth/login";
}
