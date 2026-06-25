/**
 * Website brand metadata. Shares `ruyinBrandCore` with the console/admin
 * portals and adds the marketing-only localized wordmark and description. This
 * path is ASCII-exempt, so the localized (CJK) brand strings live here.
 */
export { markSrc } from "@umbra/shared/brand";
import { ruyinBrandCore } from "@umbra/shared/brand";

export const ruyinBrand = {
  ...ruyinBrandCore,
  localName: "如影",
  fullName: "如影随形",
  description: "Ruyin - secure intelligent network access by vxture studio.",
} as const;
