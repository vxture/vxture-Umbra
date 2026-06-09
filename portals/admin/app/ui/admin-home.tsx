"use client";

import { useTheme } from "@vxture/design-system";

/** Product wordmark (shared across Ruyin portals). */
const PRODUCT_DOMAIN = "ruyin.ai";

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

export function AdminHome() {
  const { theme } = useTheme();
  return (
    <div className="admin-page">
      <header className="admin-header">
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
        <ThemeToggle />
      </header>

      <main className="admin-cards">
        {/* --- VPN Management Card --- */}
        <a
          className="admin-card"
          href="/dashboard/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="card-icon card-icon-vpn">
            <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="4" y="16" width="32" height="20" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M14 16V12a6 6 0 0 1 12 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="20" cy="26" r="3" fill="currentColor" opacity="0.7"/>
              <path d="M20 29v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="card-body">
            <h2 className="card-title">VPN Management</h2>
            <p className="card-desc">
              Manage users, traffic, and proxy settings via Marzban dashboard.
            </p>
            <span className="card-link">
              Open Marzban &rarr;
            </span>
          </div>
        </a>

        {/* --- Password Management Card --- */}
        <a
          className="admin-card"
          href="https://pass.ruyin.ai/admin"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="card-icon card-icon-pass">
            <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="4" y="16" width="32" height="20" rx="4" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M14 16V12a6 6 0 0 1 12 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 28h16M12 32h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="card-body">
            <h2 className="card-title">Password Management</h2>
            <p className="card-desc">
              Manage credentials and shared vaults via Vaultwarden admin panel.
            </p>
            <span className="card-link">
              Open Vaultwarden &rarr;
            </span>
          </div>
        </a>
      </main>

      <footer className="admin-footer">
        <span>Ruyin Admin &middot; vxture studio</span>
      </footer>
    </div>
  );
}
