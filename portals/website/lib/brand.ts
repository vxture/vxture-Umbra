/** Absolute URL to the Ruyin symbol PNG for the given resolved theme. */
export function markSrc(resolved: string): string {
  return resolved === "dark"
    ? "/assets/brand/ruyin-symbol-dark.png"
    : "/assets/brand/ruyin-symbol-light.png";
}

/** Absolute URL to the Ruyin hero PNG for the given resolved theme. */
export function signatureSrc(resolved: string): string {
  return resolved === "dark"
    ? "/assets/brand/ruyin-hero-dark.png"
    : "/assets/brand/ruyin-hero-light.png";
}

export const ruyinBrand = {
  productName: "Ruyin",
  localName: "如影",
  fullName: "如影随形",
  description: "Ruyin - secure intelligent network access by vxture studio.",
  /** Parent studio masterbrand (analogous to Anthropic for Claude). */
  studioName: "vxturestudio",
  /** Product wordmark shown beside the studio name. */
  productDomain: "ruyin.ai",
  studioUrl: "https://vxture.com",
  /** Public marketing front door (this site); used as the post-login returnTo. */
  siteUrl: "https://ruyin.ai",
  /** Ruyin account console (self-service portal / the workspace app). */
  consoleUrl: "https://console.ruyin.ai",
  copyright: "© 2026 vxture studio, inc. All rights reserved.",
  legalLinks: [
    ["Terms of Service", "https://vxture.com/legal/terms"],
    ["Privacy Policy", "https://vxture.com/legal/privacy"],
    ["Copyright Policy", "https://vxture.com/legal/copyright"],
    ["Brand Policy", "https://vxture.com/legal/brand"],
    ["Cookie Policy", "https://vxture.com/legal/cookies"],
  ],
} as const;
