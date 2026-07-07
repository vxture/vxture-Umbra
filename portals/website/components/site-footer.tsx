import { ShellLegalFooter } from "@vxture/design-system";
import { umbraBrand } from "@/lib/brand";

export function SiteFooter() {
  return (
    <ShellLegalFooter
      className="site-footer"
      innerClassName="site-footer-inner"
      copyright={umbraBrand.copyright}
      links={umbraBrand.legalLinks
        .filter(([label]) =>
          /Terms of Service|Privacy Policy|Cookie Policy/.test(label)
        )
        .map(([label, href]) => ({ label, href }))}
    />
  );
}
