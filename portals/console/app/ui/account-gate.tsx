"use client";

import { useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Skeleton } from "@vxture/design-system";
import { Shell } from "./shell";
import { fetchJson, ssoStartUrl } from "./api";
import type { SessionPayload } from "./types";

/**
 * Session gate shared by every console page (home, personal info, subscription
 * details). Loads /api/account/session once. Anonymous visitors are sent
 * straight to the unified Vxture sign-in (no console-owned login page); the
 * active session is handed to `children` (rendered inside the Shell main).
 */
export function AccountGate({
  initialInvite,
  children,
}: {
  initialInvite?: string;
  children: (
    session: SessionPayload,
    setSession: Dispatch<SetStateAction<SessionPayload | null>>,
  ) => ReactNode;
}) {
  const [session, setSession] = useState<SessionPayload | null>(null);

  async function refresh() {
    setSession(await fetchJson<SessionPayload>("/api/account/session"));
  }

  useEffect(() => {
    refresh().catch(() => setSession({ status: "anonymous" }));
  }, []);

  // Unified auth: an anonymous visitor never sees a console login page - bounce
  // to accounts.vxture.com and come back signed in (invite preserved). On
  // sign-in failure the callback lands on the public site, so this cannot loop.
  useEffect(() => {
    if (session?.status === "anonymous") {
      window.location.assign(ssoStartUrl(session, initialInvite));
    }
  }, [session, initialInvite]);

  if (!session || session.status === "anonymous") {
    return (
      <Shell>
        <section className="auth-card page-stack">
          <Skeleton variant="line" lines={3} />
        </section>
      </Shell>
    );
  }

  return <Shell user={session.user}>{children(session, setSession)}</Shell>;
}
