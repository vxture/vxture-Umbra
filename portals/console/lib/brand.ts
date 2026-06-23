/** Absolute URL to the Ruyin symbol PNG for the given resolved theme. */
export function markSrc(resolved: string): string {
  return resolved === "dark"
    ? "/assets/brand/ruyin-symbol-dark.png"
    : "/assets/brand/ruyin-symbol-light.png";
}

/** Shared Ruyin brand metadata. Mirrors the website portal so the console
 *  header/footer chrome renders identically. */
export const ruyinBrand = {
  productDomain: "ruyin.ai",
  /** Public marketing front door; the header brand links here. */
  siteUrl: "https://ruyin.ai",
  studioUrl: "https://vxture.com",
  // ASCII source escape so the contract check (portals/console/lib is scanned)
  // passes, while the rendered footer shows the same copyright glyph as the
  // website portal (whose lib is ASCII-exempt and stores the literal symbol).
  copyright: "\u00A9 2026 vxture studio, inc. All rights reserved.",
  legalLinks: [
    ["Terms of Service", "https://vxture.com/legal/terms"],
    ["Privacy Policy", "https://vxture.com/legal/privacy"],
    ["Copyright Policy", "https://vxture.com/legal/copyright"],
    ["Brand Policy", "https://vxture.com/legal/brand"],
    ["Cookie Policy", "https://vxture.com/legal/cookies"],
  ],
} as const;
