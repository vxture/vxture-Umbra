"use client";

import { useEffect, useState } from "react";
import {
  Icon,
  ShellPreferencePanel,
  ShellUserMenu,
  useTheme,
  type ShellThemePreference,
} from "@vxture/design-system";
import type { Locale } from "@vxture/shared";
import {
  getFontSize,
  persistDensity,
  persistFontSize,
  persistTheme,
  type PrefFontSize,
} from "@umbra/shared/preferences";
import { useLocale } from "@/lib/locale-provider";
import { ruyinBrand } from "@/lib/brand";
import { logout, type SessionUser } from "@/lib/session";

type RoleKey = "owner" | "manager" | "member";

/** Default account silhouette when the session carries no picture. Three states
 *  ship under /assets/icons; the signed-in account menu always represents an
 *  online user, so it uses the online variant (offline / fill are kept here for
 *  other surfaces and as the documented contract). */
const DEFAULT_AVATAR = {
  online: "/assets/icons/avatar-default-online.svg",
  offline: "/assets/icons/avatar-default-offline.svg",
  fill: "/assets/icons/avatar-default.svg",
} as const;

const COPY = {
  "en-US": {
    account: "Account menu",
    verified: "Verified",
    unverified: "Unverified",
    profile: "Personal info",
    org: "Organization",
    workspace: "Workspace",
    preferences: "Preferences",
    language: "Language",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    density: "Density",
    densityCompact: "Compact",
    densityDefault: "Default",
    densityComfortable: "Comfortable",
    fontSize: "Font size",
    fontSmall: "Small",
    fontDefault: "Default",
    fontLarge: "Large",
    switchUser: "Switch account",
    signout: "Sign out",
    fallbackName: "Account",
    roles: { owner: "Owner", manager: "Manager", member: "Member" },
    tenantOrg: "Organization",
    tenantPersonal: "Personal",
  },
  "zh-CN": {
    account: "账户菜单",
    verified: "已认证",
    unverified: "未认证",
    profile: "个人信息",
    org: "组织",
    workspace: "工作区",
    preferences: "偏好设置",
    language: "语言",
    theme: "主题",
    themeSystem: "跟随系统",
    themeLight: "亮色",
    themeDark: "暗色",
    density: "密度",
    densityCompact: "紧凑",
    densityDefault: "默认",
    densityComfortable: "宽松",
    fontSize: "字号",
    fontSmall: "小",
    fontDefault: "默认",
    fontLarge: "大",
    switchUser: "切换用户",
    signout: "退出登录",
    fallbackName: "账号",
    roles: { owner: "拥有者", manager: "管理员", member: "成员" },
    tenantOrg: "组织租户",
    tenantPersonal: "个人租户",
  },
} as const;

/** Drop a leading country code so Chinese users see only the national number:
 *  "+86 138 0000 0000" -> "138 0000 0000". */
function nationalPhone(phone: string): string {
  return phone
    .replace(/^\+?\s*86[\s-]*/, "")
    .replace(/^\+\d{1,3}[\s-]*/, "")
    .trim();
}

function primaryRole(user: SessionUser): RoleKey {
  const set = new Set(
    [...(user.roles ?? []), user.role]
      .filter((r): r is string => Boolean(r))
      .map((r) => r.toLowerCase()),
  );
  if (set.has("owner")) return "owner";
  if (set.has("manager") || set.has("admin")) return "manager";
  return "member";
}

/**
 * Signed-in account menu for the public site header. Built on the DS
 * ShellUserMenu + ShellPreferencePanel - the same components the vxture-website
 * header uses - so the website matches that look exactly: an avatar trigger with
 * an online dot opens a spacious popover with a bold identity line, role / tenant
 * / verification badges, separated sections, the personal-info block (profile
 * link + current org / workspace), the full preference panel (language dropdown
 * that scales to every supported locale, plus three-segment theme / density /
 * font controls), and the account actions. All preference changes also persist
 * to the cross-subdomain cookies (see @umbra/shared/preferences).
 */
export function UserDropdown({ user }: { user: SessionUser }) {
  const { locale, setLocale } = useLocale();
  const { mode, setMode, density, setDensity } = useTheme();
  const t = COPY[locale] ?? COPY["en-US"];

  const [fontSize, setFontSize] = useState<PrefFontSize>("default");
  useEffect(() => {
    setFontSize(getFontSize());
  }, []);

  const name =
    user.displayName || user.username || user.email || user.phone || t.fallbackName;
  const uniqueLine =
    user.email && name !== user.email
      ? user.email
      : user.phone
        ? nationalPhone(user.phone)
        : user.email || "";
  const verified = Boolean(user.emailVerified || user.phoneVerified);
  const role = primaryRole(user);
  const isOrg = user.userType === "organization" || Boolean(user.orgId);
  const avatarFallback = Array.from(name.trim() || "U")[0]?.toLocaleUpperCase() ?? "U";

  const handleFontSize = (next: PrefFontSize) => {
    setFontSize(next);
    persistFontSize(next);
  };
  const openProfile = () => {
    window.open(`${ruyinBrand.consoleUrl}/account`, "_blank", "noopener,noreferrer");
  };

  const settings = (
    <div className="acct-settings">
      <div className="acct-info">
        <button type="button" className="acct-info-link" onClick={openProfile}>
          <Icon name="user" size="sm" className="acct-info-icon" />
          <span className="acct-info-text">{t.profile}</span>
          <Icon name="arrow-long-right" size="xs" className="acct-info-go" />
        </button>
        {user.orgId ? (
          <div className="acct-info-row">
            <Icon name="building-library" size="sm" className="acct-info-icon" />
            <span className="acct-info-text">{t.org}</span>
            <span className="acct-info-val">{user.orgId}</span>
          </div>
        ) : null}
        {user.workspaceId ? (
          <div className="acct-info-row">
            <Icon name="squares-four" size="sm" className="acct-info-icon" />
            <span className="acct-info-text">{t.workspace}</span>
            <span className="acct-info-val">{user.workspaceId}</span>
          </div>
        ) : null}
      </div>

      <div className="acct-settings-divider" />

      <ShellPreferencePanel
        locale={locale}
        theme={mode}
        density={density}
        fontSize={fontSize}
        labels={{
          title: t.preferences,
          locale: t.language,
          theme: t.theme,
          density: t.density,
          fontSize: t.fontSize,
          themeOptions: {
            system: t.themeSystem,
            light: t.themeLight,
            dark: t.themeDark,
          },
          densityOptions: {
            compact: t.densityCompact,
            default: t.densityDefault,
            comfortable: t.densityComfortable,
          },
          fontSizeOptions: {
            small: t.fontSmall,
            default: t.fontDefault,
            large: t.fontLarge,
          },
        }}
        onLocaleChange={(next: Locale) => setLocale(next)}
        onThemeChange={(next: ShellThemePreference) => {
          setMode(next);
          persistTheme(next);
        }}
        onDensityChange={(next) => {
          setDensity(next);
          persistDensity(next);
        }}
        onFontSizeChange={(next) => handleFontSize(next)}
      />
    </div>
  );

  return (
    <ShellUserMenu
      user={{
        displayName: name,
        uniqueLine,
        avatarSrc: user.avatarUrl?.trim() || DEFAULT_AVATAR.online,
        avatarAlt: name,
        avatarFallback,
        badges: [
          { key: "role", label: t.roles[role] },
          { key: "tenant", label: isOrg ? t.tenantOrg : t.tenantPersonal },
          {
            key: "verified",
            label: (
              <span className="acct-verify-badge">
                <Icon name="check" size="xs" />
                {verified ? t.verified : t.unverified}
              </span>
            ),
          },
        ],
      }}
      openLabel={t.account}
      online
      settings={settings}
      actions={[
        {
          key: "switch-user",
          label: t.switchUser,
          icon: "user-switch",
          onClick: () => logout(),
        },
        {
          key: "sign-out",
          label: t.signout,
          icon: "sign-out",
          onClick: () => logout(),
        },
      ]}
    />
  );
}
