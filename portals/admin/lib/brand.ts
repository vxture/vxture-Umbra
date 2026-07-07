/**
 * Admin brand metadata. Shares `umbraBrandCore` with the website/console
 * portals, then overrides the header wordmark: the admin portal is the
 * management surface, distinct from the marketing site / tenant console which
 * show the bare "ruyin.ai" domain.
 */
export { markSrc } from "@umbra/shared/brand";
import { umbraBrandCore } from "@umbra/shared/brand";

export const umbraBrand = {
  ...umbraBrandCore,
  productName: "Umbra Admin Platform",
} as const;
