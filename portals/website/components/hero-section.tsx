"use client";

import { useTranslations } from "@umbra/shared/i18n";
import { umbraBrand } from "@/lib/brand";
import { HeroSignature } from "@/components/hero-signature";

/**
 * Hero band of the homepage: the middle of the three sections. Fills the space
 * between the header (64px) and footer (48px) and centers its lockup both axes
 * (geometry owned by .hero-section in globals.css). Content chain:
 * eyebrow -> signature artwork -> accessible title -> lead -> CTA.
 */
export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <main className="hero-section">
      <section className="hero" aria-labelledby="hero-title">
        <p className="hero-eyebrow">
          <span className="eyebrow-studio">Vxture Studio</span>
          <span className="eyebrow-sep"> | </span>
          <span className="eyebrow-product">Ruyin Agent</span>
        </p>
        <div className="hero-signature">
          <HeroSignature />
        </div>
        <h1 id="hero-title" className="hero-title">
          {umbraBrand.fullName}
        </h1>
        <p className="hero-lead">{t("lead")}</p>
        <a className="hero-cta" href="https://ruyin.vxture.com">
          {t("action")}
        </a>
      </section>
    </main>
  );
}
