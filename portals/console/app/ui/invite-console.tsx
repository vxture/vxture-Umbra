"use client";

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
  const [busy, setBusy] = useState("");

  async function refresh() {
    setData(await api<AdminInvitesPayload>("/api/account/admin/invites"));
  }

  useEffect(() => {
    refresh().catch(() => setData({ status: "forbidden", users: [], summary: { users: 0, bound: 0, invitePending: 0, pendingBinding: 0 } }));
  }, []);

  async function generate(username: string) {
    setBusy(username);
    setMessage("");
    try {
      const payload = await api<{ inviteCode?: string }>("/api/account/admin/invites", {
        method: "POST",
        body: JSON.stringify({ username }),
      });
      setMessage(payload.inviteCode ? `Invite for ${username}: ${payload.inviteCode}` : "Invite generated.");
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

  if (data.status === "forbidden") {
    return (
      <Shell>
        <section className="section-card auth-card page-stack">
          <PageHeader
            title="Invite access required"
            description="Your Vxture account is signed in, but it does not have invite management permission."
          />
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
                  <th>Subscription / Invite</th>
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
                      {row.subscriptionUrl || row.inviteCode ? (
                        <code className="code-box">{row.subscriptionUrl || row.inviteCode}</code>
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
                              onClick={() => navigator.clipboard.writeText(row.inviteCode || "")}
                            >
                              Copy
                            </button>
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
