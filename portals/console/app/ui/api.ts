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
  // redirects to accounts.vxture.com/oidc/authorize). Always available.
  return invite ? `/auth/login?invite=${encodeURIComponent(invite)}` : "/auth/login";
}
