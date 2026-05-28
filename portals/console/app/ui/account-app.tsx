"use client";

import { useEffect, useMemo, useState } from "react";
import { Metric, PageHeader, Shell } from "./shell";
import type { AccountBinding, SessionPayload } from "./types";

type View = "home" | "dashboard" | "register";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
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

function ssoStartUrl(session: SessionPayload) {
  if (session.ssoUrl) {
    return "/auth/start";
  }
  return session.loginUrl || "https://console.vxture.com/zh-CN/signin";
}

export function AccountApp({ initialView }: { initialView: View }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const next = await fetchJson<SessionPayload>("/api/account/session");
    setSession(next);
  }

  useEffect(() => {
    refresh().catch(() => setSession({ status: "anonymous" }));
  }, []);

  const account = session?.account ?? null;
  const view = useMemo(() => {
    if (initialView === "register") return "register";
    if (initialView === "dashboard") return "dashboard";
    return account ? "dashboard" : "home";
  }, [account, initialView]);

  async function bindInvite() {
    setBusy(true);
    setMessage("");
    try {
      const payload = await fetchJson<{ account?: AccountBinding; message?: string }>("/api/account/bind-invite", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      });
      setMessage("Invite bound.");
      setSession((current) =>
        current ? { ...current, account: payload.account ?? null } : current,
      );
    } catch (error) {
      const payload = (error as { payload?: { message?: string } }).payload;
      setMessage(payload?.message || "Invite could not be bound.");
    } finally {
      setBusy(false);
    }
  }

  async function resetSubscription() {
    setBusy(true);
    setMessage("");
    try {
      const payload = await fetchJson<{ status: string; account?: AccountBinding }>("/api/account/reset-subscription", {
        method: "POST",
        body: "{}",
      });
      setMessage(
        payload.status === "updated"
          ? "Subscription URL reset."
          : payload.status === "current"
            ? "Subscription URL already matches Marzban."
            : "Subscription URL could not be reset.",
      );
      if (payload.account) {
        setSession((current) => (current ? { ...current, account: payload.account } : current));
      }
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <Shell>
        <section className="section-card auth-card">Loading...</section>
      </Shell>
    );
  }

  if (session.status === "anonymous") {
    return (
      <Shell>
        <section className="section-card auth-card page-stack">
          <PageHeader
            title="Sign in with Vxture"
            description="Use your unified Vxture account before binding a Ruyin VPN invite."
          />
          <a className="btn btn-primary" href={ssoStartUrl(session)}>
            Continue with Vxture
          </a>
          <p className="muted">
            After signing in, return here and enter the invite code from your administrator.
          </p>
        </section>
      </Shell>
    );
  }

  if (view === "register" || !account) {
    return (
      <Shell>
        <section className="section-card auth-card page-stack">
          <PageHeader
            title="Bind invite"
            description="Your Vxture account is active. Bind the one-time invite code to reveal your VPN subscription."
          />
          {message ? <div className="notice">{message}</div> : null}
          <div className="form">
            <label className="field">
              Invite code
              <input
                className="input"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="RY-XXXX-XXXX-XXXX-XXXX"
              />
            </label>
            <button className="btn btn-primary" disabled={busy} onClick={bindInvite}>
              Bind invite
            </button>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="page-stack">
        <PageHeader
          title={account.displayName}
          description="Your Ruyin subscription status and client address."
        />
        {message ? <div className="notice">{message}</div> : null}
        <section className="split">
          <div className="section-card page-stack">
            <div className="grid">
              <Metric label="User code" value={account.profileName} />
              <Metric label="Status" value={account.status} />
              <Metric label="Used traffic" value={account.usedText} />
              <Metric label="Total traffic" value={account.dataLimitText} />
              <Metric label="Remaining" value={account.remainingText} />
              <Metric label="Expire" value={account.expireText} />
              <Metric label="Last online" value={account.onlineText} />
            </div>
          </div>
          <aside className="section-card page-stack">
            <h2>Subscription URL</h2>
            <code className="code-box" id="subscription-url">
              {account.subscriptionUrl}
            </code>
            <div className="actions">
              <button
                className="btn btn-primary"
                onClick={() => navigator.clipboard.writeText(account.subscriptionUrl)}
              >
                Copy URL
              </button>
              <button className="btn btn-danger" disabled={busy} onClick={resetSubscription}>
                Reset URL
              </button>
            </div>
            <p className="muted">
              Copy this URL into Clash Verge, v2rayN, Stash, or a compatible client.
            </p>
          </aside>
        </section>
      </div>
    </Shell>
  );
}
