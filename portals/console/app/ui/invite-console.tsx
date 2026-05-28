"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Metric, PageHeader, Shell } from "./shell";
import type { AdminInvitesPayload, AdminUserRow } from "./types";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
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

function bindingLabel(row: AdminUserRow) {
  if (row.bindingState === "bound") return `Bound: ${row.displayName ?? row.username}`;
  if (row.bindingState === "invite_pending") return "Invite pending";
  return "Pending binding";
}

export function InviteConsole() {
  const [data, setData] = useState<AdminInvitesPayload | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function refresh() {
    setData(await api<AdminInvitesPayload>("/api/account/admin/invites"));
  }

  useEffect(() => {
    refresh().catch((error) => {
      const status = error?.payload?.status === "admin_login_required" ? "admin_login_required" : "marzban_unavailable";
      setData({ status, users: [], summary: { users: 0, bound: 0, invitePending: 0, pendingBinding: 0 } });
    });
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("login");
    setError("");
    try {
      await api("/api/account/admin/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setPassword("");
      await refresh();
    } catch {
      setError("Invalid Marzban admin credentials.");
    } finally {
      setBusy("");
    }
  }

  async function logout() {
    setBusy("logout");
    setError("");
    try {
      await api("/api/account/admin/logout", { method: "POST", body: "{}" });
      setData({ status: "admin_login_required", users: [], summary: { users: 0, bound: 0, invitePending: 0, pendingBinding: 0 } });
    } finally {
      setBusy("");
    }
  }

  async function generate(username: string) {
    setBusy(username);
    setMessage("");
    try {
      const payload = await api<{ inviteCode?: string; inviteUrl?: string }>("/api/account/admin/invites", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setMessage(payload.inviteUrl ? `Invite link for ${username}: ${payload.inviteUrl}` : "Invite generated.");
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function reset(username: string) {
    setBusy(username);
    setMessage("");
    try {
      await api("/api/account/admin/reset-subscription", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setMessage(`Subscription URL reset requested for ${username}.`);
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function revoke(id: number | null) {
    if (!id) return;
    setBusy(String(id));
    setMessage("");
    try {
      await api("/api/account/admin/revoke", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      setMessage("Invite revoked.");
      await refresh();
    } finally {
      setBusy("");
    }
  }

  if (!data) {
    return (
      <Shell>
        <section className="section-card">Loading...</section>
      </Shell>
    );
  }

  if (data.status === "admin_login_required") {
    return (
      <Shell>
        <section className="section-card auth-card page-stack">
          <PageHeader
            title="Admin Sign In"
            description="Use the same Marzban admin account to manage Ruyin invites."
          />
          {error ? <div className="notice notice-danger">{error}</div> : null}
          <form className="form" onSubmit={login}>
            <label className="field">
              Admin username
              <input
                className="input"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="field">
              Admin password
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy === "login"}>
              Sign in
            </button>
          </form>
        </section>
      </Shell>
    );
  }

  if (data.status !== "ok") {
    return (
      <Shell>
        <section className="section-card auth-card page-stack">
          <PageHeader title="Invite Console Unavailable" description="Marzban could not be reached. Try again after services recover." />
          <button className="btn btn-secondary" onClick={refresh}>
            Retry
          </button>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="page-stack">
        <PageHeader
          title="Invite Console"
          description="Generate one-time VPN invites for existing Marzban users and manage bound subscriptions."
        />
        <div className="actions">
          <a className="btn btn-secondary" href="/dashboard/">
            Marzban Dashboard
          </a>
          <button className="btn btn-secondary" disabled={busy === "logout"} onClick={logout}>
            Sign out
          </button>
        </div>
        {message ? <div className="notice">{message}</div> : null}
        <section className="grid">
          <Metric label="Users" value={data.summary.users} />
          <Metric label="Bound" value={data.summary.bound} />
          <Metric label="Invite pending" value={data.summary.invitePending} />
          <Metric label="Pending binding" value={data.summary.pendingBinding} />
        </section>
        <section className="section-card page-stack">
          <h2>Marzban users</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User code</th>
                  <th>Status</th>
                  <th>Used</th>
                  <th>Total</th>
                  <th>Expire</th>
                  <th>Last online</th>
                  <th>Binding</th>
                  <th>Subscription / Invite link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((row) => (
                  <tr key={row.username}>
                    <td>{row.username}</td>
                    <td>{row.status}</td>
                    <td>{row.usedText}</td>
                    <td>{row.dataLimitText}</td>
                    <td>{row.expireText}</td>
                    <td>{row.onlineText}</td>
                    <td>{bindingLabel(row)}</td>
                    <td>
                      {row.subscriptionUrl || row.inviteUrl || row.inviteCode ? (
                        <code className="code-box">{row.subscriptionUrl || row.inviteUrl || row.inviteCode}</code>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        {row.subscriptionUrl ? (
                          <>
                            <button
                              className="btn btn-secondary"
                              onClick={() => navigator.clipboard.writeText(row.subscriptionUrl || "")}
                            >
                              Copy
                            </button>
                            <button
                              className="btn btn-danger"
                              disabled={busy === row.username}
                              onClick={() => reset(row.username)}
                            >
                              Reset
                            </button>
                          </>
                        ) : row.inviteCode ? (
                          <>
                            <button
                              className="btn btn-secondary"
                              onClick={() => navigator.clipboard.writeText(row.inviteUrl || row.inviteCode || "")}
                            >
                              Copy link
                            </button>
                            {row.inviteCode ? (
                              <button
                                className="btn btn-secondary"
                                onClick={() => navigator.clipboard.writeText(row.inviteCode || "")}
                              >
                                Copy code
                              </button>
                            ) : null}
                            <button
                              className="btn btn-secondary"
                              disabled={busy === String(row.inviteId)}
                              onClick={() => revoke(row.inviteId)}
                            >
                              Revoke
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-primary"
                            disabled={busy === row.username}
                            onClick={() => generate(row.username)}
                          >
                            Generate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Shell>
  );
}
