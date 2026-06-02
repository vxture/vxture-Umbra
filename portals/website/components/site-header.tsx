"use client";

import { useEffect, useState } from "react";
import { ruyinBrand, markSrc } from "@/lib/brand";
import { useTheme } from "@vxture/design-system";
import { useLocale } from "@/lib/locale-provider";

const LOCALE_LABELS: Record<string, string> = {
  "en-US": "EN",
  "zh-CN": "中文",
};

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const src = markSrc(theme);
  const { locale, toggle: toggleLocale } = useLocale();

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
        <a
          className="vx-brand-lockup"
          href="/"
          aria-label={`${ruyinBrand.productName} home`}
        >
          <img className="vx-brand-mark" src={src} alt="" />
          <span className="vx-brand-name">{ruyinBrand.productName}</span>
          <span className="vx-brand-separator" aria-hidden="true">
            |
          </span>
          <span className="vx-brand-local-name">{ruyinBrand.localName}</span>
        </a>

        <div className="site-tools" aria-label="Display controls">
          <button
            className="site-tool-button"
            type="button"
            aria-label={`Switch language (current: ${locale})`}
            title={`Language: ${locale}`}
            onClick={toggleLocale}
          >
            <span className="tool-label">{LOCALE_LABELS[locale]}</span>
          </button>
          <button
            className="site-tool-button"
            type="button"
            aria-label={`Switch theme (current: ${theme})`}
            title={`Theme: ${theme}`}
            onClick={toggleTheme}
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
        </div>
      </div>
    </header>
  );
}
