"use client";

import { useEffect, useState } from "react";
import { ruyinBrand, markSrc } from "@/lib/brand";
import { useTheme } from "@vxture/design-system";
import { useLocale } from "@/lib/locale-provider";

/** Full language name per locale (used for the control's title/aria). */
const LOCALE_NAMES: Record<string, string> = {
  "en-US": "English",
  "zh-CN": "中文",
};

const HEADER_TEXT: Record<
  string,
  { register: string; login: string; language: string; theme: string }
> = {
  "en-US": {
    register: "Sign up",
    login: "Log in",
    language: "Language",
    theme: "Theme",
  },
  "zh-CN": {
    register: "注册",
    login: "登录",
    language: "语言",
    theme: "主题",
  },
};

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={`Switch theme (current: ${theme})`}
      title={`Theme: ${theme}`}
      onClick={toggle}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2" />
          <path d="M12 21v2" />
          <path d="M4.22 4.22l1.42 1.42" />
          <path d="M18.36 18.36l1.42 1.42" />
          <path d="M1 12h2" />
          <path d="M21 12h2" />
          <path d="M4.22 19.78l1.42-1.42" />
          <path d="M18.36 5.64l1.42-1.42" />
        </svg>
      )}
    </button>
  );
}

function LanguageToggle({ label }: { label: string }) {
  const { locale, toggle } = useLocale();
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={`${label} (${LOCALE_NAMES[locale]})`}
      title={`${label}: ${LOCALE_NAMES[locale]}`}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
      </svg>
    </button>
  );
}

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme } = useTheme();
  const src = markSrc(theme);
  const { locale } = useLocale();
  const text = HEADER_TEXT[locale] ?? HEADER_TEXT["en-US"];

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > 50);
    update();
    window.addEventListener("scroll", update);
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={`site-header${isScrolled ? " is-scrolled" : ""}`}
      aria-label={ruyinBrand.productName}
    >
      <div className="site-header-inner">
        <div className="site-brand">
          <a
            className="vx-brand-lockup"
            href="/"
            aria-label={`${ruyinBrand.productDomain} home`}
          >
            <img className="vx-brand-mark" src={src} alt="" />
            <span className="vx-brand-name">{ruyinBrand.productDomain}</span>
          </a>
        </div>

        <div className="site-actions">
          <div className="site-tools" aria-label="Display controls">
            <ThemeToggle />
            <LanguageToggle label={text.language} />
          </div>

          <a
            className="site-cta site-cta-secondary"
            href={ruyinBrand.registerUrl}
          >
            {text.register}
          </a>
          <a className="site-cta site-cta-primary" href={ruyinBrand.loginUrl}>
            {text.login}
          </a>
        </div>
      </div>
    </header>
  );
}
