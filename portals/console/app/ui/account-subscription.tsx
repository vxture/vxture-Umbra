"use client";

import { useState } from "react";
import type { CSSProperties, Dispatch, SetStateAction } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  MetricGrid,
  StatusBadge,
  useToast,
} from "@vxture/design-system";
import type { IconName, MetricGridItem, StatusBadgeTone } from "@vxture/design-system";
import { useTranslations } from "@umbra/shared/i18n";
import { AccountGate } from "./account-gate";
import { fetchJson } from "./api";
import type { AccountBinding, SessionPayload } from "./types";

function statusTone(status: string): StatusBadgeTone {
  const value = status.toLowerCase();
  if (value === "active") return "success";
  if (value === "limited" || value === "expired") return "warning";
  if (value === "disabled") return "danger";
  return "neutral";
}

type StatFoot = { k: string; v: string };

type StatProps = {
  tone: string;
  icon: IconName;
  title: string;
  value: string;
  text?: boolean;
  foot?: StatFoot[];
};

/** Headline metric card: tone bar, icon + title, big value, optional foot tags. */
function StatCard({ tone, icon, title, value, text, foot }: StatProps) {
  const tags = (foot ?? []).filter((f) => f.v);
  return (
    <div className="statc" style={{ "--tone": tone } as CSSProperties}>
      <div className="statc-titlerow">
        <span className="statc-ico">
          <Icon name={icon} size={19} weight="fill" />
        </span>
        <span className="statc-title">{title}</span>
      </div>
      <div className="statc-val">
        <span className={"statc-num" + (text ? " is-text" : "")} title={value}>
          {value}
        </span>
      </div>
      {tags.length > 0 && (
        <div className="statc-foot">
          {tags.map((f, i) => (
            <div className="statc-foot-item" key={i}>
              <span className="statc-foot-k">{f.k}</span>
              <span className="statc-foot-v">{f.v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubscriptionDetail({
  session,
  setSession,
}: {
  session: SessionPayload;
  setSession: Dispatch<SetStateAction<SessionPayload | null>>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("subscription");
  const account = session.account ?? null;

  async function resetSubscription() {
    setBusy(true);
    try {
      const payload = await fetchJson<{ status: string; account?: AccountBinding }>(
        "/api/account/apps/vpn/action/reset",
        { method: "POST", body: "{}" },
      );
      if (payload.status === "updated") {
        toast({ tone: "success", title: t("resetToast") });
      } else if (payload.status === "current") {
        toast({ tone: "info", title: t("resetCurrentToast") });
      } else {
        toast({ tone: "error", title: t("resetFailToast") });
      }
      if (payload.account) {
        setSession((current) => (current ? { ...current, account: payload.account } : current));
      }
    } catch {
      toast({ tone: "error", title: t("resetFailToast") });
    } finally {
      setBusy(false);
      setConfirmReset(false);
    }
  }

  if (!account) {
    return (
      <div className="screen">
        <div className="tpl-head">
          <span className="tpl-head-ico">
            <Icon name="chart-bar" size="xl" />
          </span>
          <div className="tpl-head-meta">
            <h1 className="tpl-head-title">{t("title")}</h1>
            <p className="tpl-head-desc">{t("noSubDesc")}</p>
          </div>
        </div>
        <p className="muted">{t("activateFirst")}</p>
        <div className="actions">
          <Button asChild>
            <a href="/">
              <Icon name="arrow-left" size="sm" />
              {t("backHome")}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const stats: StatProps[] = [
    {
      tone: "var(--vx-color-brand-600)",
      icon: "chart-bar",
      title: t("metrics.used"),
      value: account.usedText,
      foot: [{ k: t("usedPercent"), v: `${account.usagePercent}%` }],
    },
    {
      tone: "var(--vx-color-success-600)",
      icon: "database",
      title: t("metrics.remaining"),
      value: account.remainingText,
      foot: [{ k: t("metrics.totalQuota"), v: account.dataLimitText }],
    },
    {
      tone: "var(--vx-color-warning-600)",
      icon: "calendar",
      title: t("metrics.expire"),
      value: account.expireText,
      text: true,
      foot: [{ k: t("metrics.quotaReset"), v: account.resetText }],
    },
    {
      tone: "var(--vx-color-info-600)",
      icon: "shield-check",
      title: t("metrics.status"),
      value: account.status,
      text: true,
      foot: [{ k: t("metrics.lastOnline"), v: account.onlineText }],
    },
  ];

  const moreMetrics: MetricGridItem[] = [
    { label: t("metrics.userCode"), value: account.profileName },
  ];
  if (account.lastClient) moreMetrics.push({ label: t("metrics.lastClient"), value: account.lastClient });
  if (account.subUpdatedText) moreMetrics.push({ label: t("metrics.subUpdated"), value: account.subUpdatedText });
  if (account.createdText) moreMetrics.push({ label: t("metrics.created"), value: account.createdText });

  return (
    <div className="screen">
      <div className="tpl-head">
        <span className="tpl-head-ico">
          <Icon name="chart-bar" size="xl" />
        </span>
        <div className="tpl-head-meta">
          <h1 className="tpl-head-title">{t("title")}</h1>
          <p className="tpl-head-desc">{t("detailsDesc")}</p>
        </div>
        <span className="tpl-head-badge">
          <StatusBadge tone={statusTone(account.status)} dot>
            {account.status}
          </StatusBadge>
        </span>
      </div>

      <div className="statc-grid">
        {stats.map((s) => (
          <StatCard key={s.title} {...s} />
        ))}
      </div>

      <div className="tpl-divider" />

      <section className="tpl-block" aria-label={t("subUrlTitle")}>
        <div className="tpl-block-hd">
          <span className="tpl-block-ico">
            <Icon name="globe" size="lg" />
          </span>
          <div className="tpl-block-meta">
            <div className="tpl-block-title">{t("subUrlTitle")}</div>
            <div className="tpl-block-sub">{t("subUrlDesc")}</div>
          </div>
        </div>
        <div className="card-stack">
          <code className="url-box">{account.subscriptionUrl}</code>
          <div className="actions">
            <Button
              onClick={() => {
                navigator.clipboard.writeText(account.subscriptionUrl);
                toast({ tone: "success", title: t("copyToast") });
              }}
            >
              <Icon name="copy" size="sm" />
              {t("copyUrl")}
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => setConfirmReset(true)}>
              <Icon name="clock-counter-clockwise" size="sm" />
              {t("resetUrl")}
            </Button>
          </div>
        </div>
      </section>

      <section className="tpl-block" aria-label={t("moreTitle")}>
        <div className="tpl-block-hd">
          <span className="tpl-block-ico">
            <Icon name="list" size="lg" />
          </span>
          <div className="tpl-block-meta">
            <div className="tpl-block-title">{t("moreTitle")}</div>
            <div className="tpl-block-sub">{t("moreDesc")}</div>
          </div>
        </div>
        <MetricGrid items={moreMetrics} />
      </section>

      <div className="actions">
        <Button variant="secondary" asChild>
          <a href="/">
            <Icon name="arrow-left" size="sm" />
            {t("back")}
          </a>
        </Button>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resetDialogTitle")}</DialogTitle>
            <DialogDescription>{t("resetDialogDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" disabled={busy} onClick={resetSubscription}>
              {t("resetUrl")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Subscription detail page (reached from the home "Enter" action). */
export function AccountSubscription() {
  return (
    <AccountGate>
      {(session, setSession) => <SubscriptionDetail session={session} setSession={setSession} />}
    </AccountGate>
  );
}
