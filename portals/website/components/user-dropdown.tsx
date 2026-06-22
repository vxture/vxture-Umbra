"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Icon,
  ShellUserMenu,
  useTheme,
  type IconName,
} from "@vxture/design-system";
import {
  LOCALE_CONFIGS,
  SUPPORTED_LOCALES,
  type Locale,
} from "@vxture/shared";
import {
  getFontSize,
  persistDensity,
  persistFontSize,
  persistTheme,
  type PrefDensity,
  type PrefFontSize,
  type PrefTheme,
} from "@umbra/shared/preferences";
import { useLocale } from "@/lib/locale-provider";
import { ruyinBrand } from "@/lib/brand";
import { logout, type SessionUser } from "@/lib/session";

type RoleKey = "owner" | "manager" | "member";

/** Default account silhouette when the session carries no picture; the signed-in
 *  menu always represents an online user (offline / fill kept as the contract). */
const DEFAULT_AVATAR = {
  online: "/assets/icons/avatar-default-online.svg",
  offline: "/assets/icons/avatar-default-offline.svg",
  fill: "/assets/icons/avatar-default.svg",
} as const;

const THEMES: readonly PrefTheme[] = ["system", "light", "dark"];
const DENSITIES: readonly PrefDensity[] = ["compact", "default", "comfortable"];
const FONT_SIZES: readonly PrefFontSize[] = ["small", "default", "large"];

const COPY = {
  "en-US": {
    account: "Account menu",
    verified: "Verified",
    unverified: "Unverified",
    profile: "Profile",
    org: "Org",
    workspace: "Workspace",
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
    switchUser: "Switch",
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

/** Drop a leading country code so CN users see only the national number. */
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

/** DS segmented ("three-segment") control - reuses the platform .vx-shell-segmented
 *  styling. Plain buttons, so a click only switches; it never dismisses the popover. */
function Segmented<T extends string>({
  value,
  options,
  optionLabels,
  onSelect,
  ariaLabel,
}: {
  value: T;
  options: readonly T[];
  optionLabels: Record<T, string>;
  onSelect: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="vx-shell-segmented" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`vx-shell-segmented__item${
            value === option ? " vx-shell-segmented__item--active" : ""
          }`}
          onClick={() => onSelect(option)}
        >
          {optionLabels[option]}
        </button>
      ))}
    </div>
  );
}

/** One row of the lower panel. Every row - personal info, preference, action -
 *  uses the same [icon | label | control] grid, so icons, labels, and controls
 *  line up across all three sections. `onClick` makes the whole row a button. */
function Row({
  icon,
  label,
  control,
  onClick,
  danger,
}: {
  icon: IconName;
  label: string;
  control?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  const className = `acct-row${onClick ? " acct-row--btn" : ""}${
    danger ? " acct-row--danger" : ""
  }`;
  const inner = (
    <>
      <Icon name={icon} size="sm" className="acct-ico" />
      <span className="acct-label">{label}</span>
      <span className="acct-ctl">{control}</span>
    </>
  );
  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className={className}>{inner}</div>
  );
}

/**
 * Signed-in account menu for the public site header. The DS ShellUserMenu
 * supplies the avatar trigger (with online dot), the bold identity line, the
 * role / tenant / verification badges, the popover chrome and the section
 * separators - the same shell the vxture-website header uses. The three lower
 * sections (user info, quick settings, account actions) are rendered into the
 * single settings slot on ONE shared [icon | label | control] grid so every
 * icon, label and control aligns across them. Preference changes persist to the
 * cross-subdomain cookies (see @umbra/shared/preferences).
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

  const handleFontSize = (next: PrefFontSize) => {
    setFontSize(next);
    persistFontSize(next);
  };

  const settings = (
    <div className="acct-panel">
      {/* User info */}
      <Row
        icon="user"
        label={t.profile}
        control={<Icon name="arrow-long-right" size="xs" className="acct-go" />}
        onClick={() =>
          window.open(`${ruyinBrand.consoleUrl}/account`, "_blank", "noopener,noreferrer")
        }
      />
      {user.orgId ? (
        <Row
          icon="building-library"
          label={t.org}
          control={<span className="acct-val">{user.orgId}</span>}
        />
      ) : null}
      {user.workspaceId ? (
        <Row
          icon="squares-four"
          label={t.workspace}
          control={<span className="acct-val">{user.workspaceId}</span>}
        />
      ) : null}

      <div className="acct-div" />

      {/* Quick settings */}
      <Row
        icon="globe"
        label={t.language}
        control={
          <select
            className="acct-sel"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            aria-label={t.language}
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <option key={loc} value={loc}>
                {LOCALE_CONFIGS[loc]?.nativeName ?? loc}
              </option>
            ))}
          </select>
        }
      />
      <Row
        icon="sun"
        label={t.theme}
        control={
          <Segmented
            ariaLabel={t.theme}
            value={mode as PrefTheme}
            options={THEMES}
            optionLabels={{
              system: t.themeSystem,
              light: t.themeLight,
              dark: t.themeDark,
            }}
            onSelect={(next) => {
              setMode(next);
              persistTheme(next);
            }}
          />
        }
      />
      <Row
        icon="rows"
        label={t.density}
        control={
          <Segmented
            ariaLabel={t.density}
            value={density as PrefDensity}
            options={DENSITIES}
            optionLabels={{
              compact: t.densityCompact,
              default: t.densityDefault,
              comfortable: t.densityComfortable,
            }}
            onSelect={(next) => {
              setDensity(next);
              persistDensity(next);
            }}
          />
        }
      />
      <Row
        icon="text-indent"
        label={t.fontSize}
        control={
          <Segmented
            ariaLabel={t.fontSize}
            value={fontSize}
            options={FONT_SIZES}
            optionLabels={{
              small: t.fontSmall,
              default: t.fontDefault,
              large: t.fontLarge,
            }}
            onSelect={handleFontSize}
          />
        }
      />

      <div className="acct-div" />

      {/* Account actions */}
      <Row icon="user-switch" label={t.switchUser} onClick={() => logout()} />
      <Row icon="sign-out" label={t.signout} danger onClick={() => logout()} />
    </div>
  );

  return (
    <ShellUserMenu
      user={{
        displayName: name,
        uniqueLine,
        avatarSrc: user.avatarUrl?.trim() || DEFAULT_AVATAR.online,
        avatarAlt: name,
        avatarFallback: Array.from(name.trim() || "U")[0]?.toLocaleUpperCase() ?? "U",
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
      contentClassName="acct-menu"
      settings={settings}
    />
  );
}
