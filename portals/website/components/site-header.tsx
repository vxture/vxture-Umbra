"use client";

import {
  Button,
  ShellBrand,
  ShellFullscreenToggle,
  ShellLocaleSwitcher,
  ShellThemeToggle,
  useTheme,
} from "@vxture/design-system";
import type { Locale } from "@vxture/shared";
import { persistTheme, type PrefTheme } from "@umbra/shared/preferences";
import { useTranslations } from "@umbra/shared/i18n";
import { UMBRA_LOCALE_OPTIONS } from "@umbra/shared/locales";
import { umbraBrand, markSrc } from "@/lib/brand";
import { useLocale } from "@/lib/locale-provider";
import { useSession } from "@/lib/session";
import { UserDropdown } from "@/components/user-dropdown";

/** Element the fullscreen toggle expands; the homepage root carries this id. */
const PAGE_FULLSCREEN_ID = "umbra-page-root";

function authStartUrl(): string {
  const returnTo = encodeURIComponent(umbraBrand.siteUrl);
  return `${umbraBrand.siteUrl}/auth/login?returnTo=${returnTo}`;
}

export function SiteHeader() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const t = useTranslations("header");
  const session = useSession();

  const user = session.user;

  return (
    <header className="site-header" aria-label={umbraBrand.productName}>
      <div className="site-header-inner">
        {/* Logo + name link to the ruyin.ai homepage (website root). The studio
            tag reuses the DS pill class (no custom CSS). */}
        <ShellBrand
          href="/"
          logoSrc={markSrc(theme)}
          logoAlt=""
          label={
            <span className="site-brand-lockup">
              <span className="site-brand-name">{umbraBrand.productDomain}</span>
              <span className="site-brand-tag">vxture studio</span>
            </span>
          }
        />

        <div className="site-actions">
          {/* Grouped quick controls [theme | language | fullscreen], mirroring
              the vxture-console header action group. */}
          <div
            className="vx-shell-header__action-group"
            role="group"
            aria-label={t("display")}
          >
            <ShellThemeToggle
              currentTheme={theme}
              buttonLabel={t("theme")}
              className="vx-shell-icon-button vx-shell-icon-button--toolbar"
              activeClassName="vx-shell-icon-button--active"
              onThemeChange={(next) => {
                setTheme(next);
                persistTheme(next as PrefTheme);
              }}
            />
            <ShellLocaleSwitcher
              currentLocale={locale as Locale}
              options={UMBRA_LOCALE_OPTIONS}
              buttonLabel={t("language")}
              buttonClassName="vx-shell-icon-button vx-shell-icon-button--toolbar"
              activeButtonClassName="vx-shell-icon-button--active"
              onLocaleChange={(next) => setLocale(next)}
            />
            <ShellFullscreenToggle
              targetId={PAGE_FULLSCREEN_ID}
              enterLabel={t("fullscreenEnter")}
              exitLabel={t("fullscreenExit")}
              className="vx-shell-icon-button vx-shell-icon-button--toolbar"
              activeClassName="vx-shell-icon-button--active"
            />
          </div>

          {session.status === "loading" ? null : session.status === "active" && user ? (
            <>
              <Button variant="ghost" className="site-workspace-btn" asChild>
                <a href={umbraBrand.consoleUrl}>{t("workspace")}</a>
              </Button>
              <UserDropdown user={user} />
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <a href={authStartUrl()}>{t("signUp")}</a>
              </Button>
              <Button asChild>
                <a href={authStartUrl()}>{t("signIn")}</a>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
