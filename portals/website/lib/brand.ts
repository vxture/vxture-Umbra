/** Absolute URL to the Ruyin symbol SVG for the given resolved theme. */
export function markSrc(resolved: string): string {
  return resolved === "dark"
    ? "/assets/brand/ruyin-symbol-dark.svg"
    : "/assets/brand/ruyin-symbol-light.svg";
}

/** Absolute URL to the Ruyin lockup SVG for the given resolved theme. */
export function signatureSrc(resolved: string): string {
  return resolved === "dark"
    ? "/assets/brand/ruyin-lockup-dark.svg"
    : "/assets/brand/ruyin-lockup-light.svg";
}

export const ruyinBrand = {
  productName: "Ruyin",
  localName: "如影",
  fullName: "如影随形",
  description: "Ruyin intelligent entry for Hermes workspace.",
  hermesUrl: "https://hermes.vxture.com",
  copyright: "© 2026 vxture studio, inc. All rights reserved.",
  legalLinks: [
    ["Terms of Service", "https://vxture.com/legal/terms"],
    ["Privacy Policy", "https://vxture.com/legal/privacy"],
    ["Copyright Policy", "https://vxture.com/legal/copyright"],
    ["Brand Policy", "https://vxture.com/legal/brand"],
    ["Cookie Policy", "https://vxture.com/legal/cookies"],
  ],
} as const;
