/**
 * Admin brand metadata. Shares `ruyinBrandCore` with the website/console
 * portals, then overrides the header wordmark: the admin portal is the
 * management surface, distinct from the marketing site / tenant console which
 * show the bare "ruyin.ai" domain.
 */
export { markSrc } from "@umbra/shared/brand";
import { ruyinBrandCore } from "@umbra/shared/brand";

export const ruyinBrand = {
  ...ruyinBrandCore,
  productName: "Ruyin Admin Platform",
} as const;
