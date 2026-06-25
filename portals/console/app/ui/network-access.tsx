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
  Input,
  useToast,
} from "@vxture/design-system";
import { useTranslations } from "@umbra/shared/i18n";
import { fetchJson } from "./api";
import type { AccountBinding, SessionPayload } from "./types";

/**
 * Application center (console home). A launcher screen listing the tenant's
 * subscribed apps as cards. There is a single app - network access - so the
 * grid collapses to one full-width card.
 *
 * Unbound: the card shows an "unbound" status and a Bind action that opens an
 * invite-code dialog. Bound: the card shows a "bound" status and an Enter action
 * that opens the full detail page (usage, quota, reset). The product never
 * labels this "VPN" in the UI.
 */
export function AppCenter({
  session,
  setSession,
  initialInvite,
}: {
  session: SessionPayload;
  setSession: Dispatch<SetStateAction<SessionPayload | null>>;
  initialInvite?: string;
}) {
  const [inviteCode, setInviteCode] = useState(initialInvite ?? "");
  const [bindOpen, setBindOpen] = useState(Boolean(initialInvite));
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("networkAccess");
  const account = session.account ?? null;
  const bound = Boolean(account);
  const tone = "var(--vx-color-brand-600)";

  async function bindInvite() {
    setBusy(true);
    try {
      const payload = await fetchJson<{ account?: AccountBinding; message?: string }>(
        "/api/account/apps/vpn/bind",
        { method: "POST", body: JSON.stringify({ inviteCode }) },
      );
      toast({ tone: "success", title: t("boundToast") });
      setSession((current) => (current ? { ...current, account: payload.account ?? null } : current));
      setBindOpen(false);
    } catch (error) {
      const payload = (error as { payload?: { message?: string } }).payload;
      toast({ tone: "error", title: t("bindFailToast"), description: payload?.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="appcenter">
      <div className="ac-head">
        <div className="ac-head-meta">
          <h1 className="ac-title">{t("appCenterTitle")}</h1>
          <p className="ac-desc">{t("appCenterSubtitle")}</p>
        </div>
        <span className="ac-head-tag">
          <Icon name="squares-four" size="sm" />
          {t("appCount", { count: 1 })}
        </span>
      </div>

      <div className="ac-grid ac-grid--single">
        <article
          className={"ac-card" + (bound ? " is-bound" : "")}
          style={{ "--tone": tone } as CSSProperties}
        >
          <span className="ac-card-art" aria-hidden="true">
            <Icon name="shield-check" size={132} weight="fill" />
          </span>
          <div className="ac-card-head">
            <Icon name="shield-check" size={26} weight="fill" className="ac-card-lead" />
            <strong className="ac-card-name">{t("title")}</strong>
          </div>
          <p className="ac-card-desc">{bound ? t("appDescBound") : t("appDescUnbound")}</p>
          <div className="ac-card-foot">
            <span className={"ac-card-status" + (bound ? "" : " is-unbound")}>
              <span className="ac-card-dot" />
              {bound ? t("statusBound") : t("statusUnbound")}
            </span>
            {bound ? (
              <Button asChild>
                <a href="/apps/vpn">
                  {t("enter")}
                  <Icon name="arrow-right" size="sm" />
                </a>
              </Button>
            ) : (
              <Button onClick={() => setBindOpen(true)}>
                <Icon name="key" size="sm" />
                {t("bind")}
              </Button>
            )}
          </div>
        </article>
      </div>

      <Dialog open={bindOpen} onOpenChange={setBindOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("bindDialogTitle")}</DialogTitle>
            <DialogDescription>{t("bindDialogDesc")}</DialogDescription>
          </DialogHeader>
          <div className="form">
            <label className="field">
              {t("inviteCode")}
              <Input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="RY-XXXX-XXXX-XXXX-XXXX"
              />
            </label>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{t("cancel")}</Button>
            </DialogClose>
            <Button onClick={bindInvite} disabled={busy || !inviteCode.trim()}>
              <Icon name="check" size="sm" />
              {t("bindInvite")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
