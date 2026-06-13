"use client";

import { useEffect, useState } from "react";

/**
 * Unified session for the public site. ruyin.ai shares one login with every
 * *.ruyin.ai app via a parent-domain cookie, so the header can read the session
 * same-origin (nginx proxies /api/account/ to the account service) and show the
 * workspace + account menu when signed in.
 */

export interface SessionUser {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
}

export interface Session {
  status: "loading" | "anonymous" | "active";
  user?: SessionUser;
}

export function useSession(): Session {
  const [session, setSession] = useState<Session>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/account/session", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!alive) return;
        if (data?.status === "active" && data.user) {
          setSession({ status: "active", user: data.user });
        } else {
          setSession({ status: "anonymous" });
        }
      })
      .catch(() => {
        if (alive) setSession({ status: "anonymous" });
      });
    return () => {
      alive = false;
    };
  }, []);

  return session;
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/account/logout", { method: "POST", credentials: "include" });
  } catch {
    // Ignore: clearing the cookie may already have signed the user out; the
    // reload re-reads the (now anonymous) session either way.
  }
  window.location.reload();
}
