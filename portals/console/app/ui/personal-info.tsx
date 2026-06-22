"use client";

import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  MetricCard,
  SectionCard,
  Separator,
  StatusBadge,
  useToast,
} from "@vxture/design-system";
import { useLocale } from "@umbra/shared/locale-provider";
import type { VxtureUser } from "./types";
import { DefaultAvatar } from "./default-avatar";

const COPY = {
  "en-US": {
    overview: "Overview",
    contactAndId: "Contact and identifiers",
    accountId: "Account ID",
    email: "Email",
    phone: "Phone",
    accountStatus: "Account status",
    org: "Organization",
    workspace: "Workspace",
    roles: "Roles",
    userType: "User type",
    verified: "verified",
    unverified: "unverified",
    idFallback: "ID",
    idHint:
      "Your global Vxture account identifier (OIDC subject). Stable and unique; use it for support requests.",
    copy: "Copy",
    copied: "Copied",
    copyOk: "Account ID copied",
    copyFail: "Copy failed",
    none: "-",
    fallbackName: "Account",
  },
  "zh-CN": {
    overview: "概览",
    contactAndId: "联系方式与标识",
    accountId: "账号 ID",
    email: "邮箱",
    phone: "手机",
    accountStatus: "账号状态",
    org: "组织",
    workspace: "工作空间",
    roles: "角色",
    userType: "用户类型",
    verified: "已验证",
    unverified: "未验证",
    idFallback: "ID",
    idHint:
      "你的全局 Vxture 账号标识(OIDC subject)。稳定且唯一,联系支持时可提供。",
    copy: "复制",
    copied: "已复制",
    copyOk: "账号 ID 已复制",
    copyFail: "复制失败",
    none: "-",
    fallbackName: "账号",
  },
} as const;

function maskId(id: string): string {
  if (id.length <= 20) return id;
  return `${id.slice(0, 12)}...${id.slice(-6)}`;
}

/**
 * Personal-info panel from the OIDC session (no extra Vxture call). Designed,
 * comprehensive layout: an identity hero + context tiles up top, then contact
 * rows with verification, then the technical account identifier (demoted:
 * masked, copyable). Organization / Workspace are name-ready - they show the
 * IdP display name when present and fall back to the id otherwise (the name
 * claims are requested upstream; see docs/design/vxture-sso.md).
 */
export function PersonalInfo({ user }: { user?: VxtureUser }) {
  const { locale } = useLocale();
  const t = COPY[locale] ?? COPY["en-US"];
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  if (!user) return null;

  const name =
    user.displayName || user.username || user.email || user.phone || t.fallbackName;
  const org = user.orgName || user.orgId || "";
  const orgIsId = !user.orgName && Boolean(user.orgId);
  const workspace = user.workspaceName || user.workspaceId || "";
  const workspaceIsId = !user.workspaceName && Boolean(user.workspaceId);
  const rolesText = user.roles && user.roles.length ? user.roles.join(", ") : t.none;
  const statusTone =
    user.accountStatus === "active" ? "success" : user.accountStatus ? "warning" : "neutral";

  const verifyTag = (verified?: boolean) => (
    <StatusBadge tone={verified ? "success" : "neutral"} dot>
      {verified ? t.verified : t.unverified}
    </StatusBadge>
  );

  const copyId = async () => {
    if (!user.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast({ title: t.copyOk, tone: "success" });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: t.copyFail, tone: "error" });
    }
  };

  return (
    <div className="card-stack">
      <SectionCard title={t.overview}>
        <div className="profile-hero">
          <Avatar className="profile-avatar">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback>
              <DefaultAvatar />
            </AvatarFallback>
          </Avatar>
          <div className="profile-hero-text">
            <strong className="profile-name">{name}</strong>
            <span className="profile-contact">{user.email || user.phone || t.none}</span>
            <div className="profile-badges">
              {user.accountStatus ? (
                <StatusBadge tone={statusTone}>{user.accountStatus}</StatusBadge>
              ) : null}
              {user.userType ? <Badge variant="secondary">{user.userType}</Badge> : null}
            </div>
          </div>
        </div>
        <div className="tile-grid">
          <MetricCard
            label={t.org}
            value={org || t.none}
            description={
              orgIsId ? (
                <span className="tile-id">
                  {t.idFallback}: {user.orgId}
                </span>
              ) : undefined
            }
          />
          <MetricCard
            label={t.workspace}
            value={workspace || t.none}
            description={
              workspaceIsId ? (
                <span className="tile-id">
                  {t.idFallback}: {user.workspaceId}
                </span>
              ) : undefined
            }
          />
          <MetricCard label={t.roles} value={rolesText} />
          <MetricCard label={t.userType} value={user.userType || t.none} />
        </div>
      </SectionCard>

      <SectionCard title={t.contactAndId}>
        <div className="info-grid">
          <div className="info-row">
            <span className="info-label">{t.email}</span>
            <span className="info-value">
              {user.email || t.none}
              {user.email ? <span className="info-tag">{verifyTag(user.emailVerified)}</span> : null}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">{t.phone}</span>
            <span className="info-value">
              {user.phone || t.none}
              {user.phone ? <span className="info-tag">{verifyTag(user.phoneVerified)}</span> : null}
            </span>
          </div>
        </div>
        <Separator />
        <div className="id-block">
          <div className="id-row">
            <span className="info-label">{t.accountId}</span>
            <code className="id-mono" title={user.id}>
              {maskId(user.id || t.none)}
            </code>
            {user.id ? (
              <Button variant="secondary" onClick={copyId}>
                {copied ? t.copied : t.copy}
              </Button>
            ) : null}
          </div>
          <p className="id-hint">{t.idHint}</p>
        </div>
      </SectionCard>
    </div>
  );
}
