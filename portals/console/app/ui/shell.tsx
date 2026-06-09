"use client";

import type { ReactNode } from "react";
import { useTheme } from "@vxture/design-system";
import { useLocale } from "../locale-provider";

/** Product wordmark (shared across Ruyin portals). */
const PRODUCT_DOMAIN = "ruyin.ai";

/** ASCII language names (this file is outside the localized-content exemption). */
const LOCALE_NAMES: Record<string, string> = {
  "en-US": "English",
  "zh-CN": "Chinese",
};

function symbolSrc(theme: string): string {
  return theme === "dark"
    ? "/assets/brand/ruyin-symbol-dark.png"
    : "/assets/brand/ruyin-symbol-light.png";
}

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

function LanguageToggle() {
  const { locale, toggle } = useLocale();
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={`Switch language (current: ${LOCALE_NAMES[locale]})`}
      title={`Language: ${LOCALE_NAMES[locale]}`}
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

export function Shell({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <a
            className="vx-brand-lockup"
            href="/"
            aria-label={`${PRODUCT_DOMAIN} home`}
          >
            <img className="vx-brand-mark" src={symbolSrc(theme)} alt="" />
            <span className="vx-brand-name">{PRODUCT_DOMAIN}</span>
          </a>
        </div>
        <div className="site-tools" aria-label="Display controls">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      <nav className="page-nav" aria-label="Sections">
        <a className="btn btn-secondary" href="/">
          Apps
        </a>
        <a className="btn btn-secondary" href="/invites">
          Invites
        </a>
      </nav>

      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </article>
  );
}
