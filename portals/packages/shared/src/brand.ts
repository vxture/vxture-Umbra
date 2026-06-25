/**
 * Canonical Ruyin brand metadata shared across all three portals (website,
 * console, admin). Each portal's lib/brand.ts spreads `ruyinBrandCore` and
 * layers on its own surface-specific fields (e.g. the website's localized
 * wordmark, the admin "Ruyin Admin Platform" header).
 *
 * This path is contract-scanned (ASCII-only): the copyright glyph is built
 * from its code point, and localized (CJK) brand strings stay in the website
 * portal's ASCII-exempt lib/brand.ts.
 */

/** Absolute URL to the Ruyin symbol PNG for the given resolved theme. */
export function markSrc(resolved: string): string {
  return resolved === "dark"
    ? "/assets/brand/ruyin-symbol-dark.png"
    : "/assets/brand/ruyin-symbol-light.png";
}

/** Copyright glyph (U+00A9) built from its code point so this ASCII-scanned
 *  source stays ASCII while the rendered footer shows the same glyph as the
 *  website portal (whose lib is ASCII-exempt and stores the literal symbol). */
const COPYRIGHT = String.fromCharCode(0xa9);

export const ruyinBrandCore = {
  /** Default product wordmark; the admin portal overrides this. */
  productName: "Ruyin",
  productDomain: "ruyin.ai",
  /** Parent studio masterbrand (analogous to Anthropic for Claude). */
  studioName: "vxturestudio",
  studioUrl: "https://vxture.com",
  /** Public marketing front door (the website); also the post-login returnTo. */
  siteUrl: "https://ruyin.ai",
  /** Ruyin account console (self-service portal / the workspace app). */
  consoleUrl: "https://console.ruyin.ai",
  copyright: `${COPYRIGHT} 2026 vxture studio, inc. All rights reserved.`,
  legalLinks: [
    ["Terms of Service", "https://vxture.com/legal/terms"],
    ["Privacy Policy", "https://vxture.com/legal/privacy"],
    ["Copyright Policy", "https://vxture.com/legal/copyright"],
    ["Brand Policy", "https://vxture.com/legal/brand"],
    ["Cookie Policy", "https://vxture.com/legal/cookies"],
  ],
} as const;
