import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ruyinBrand } from "@/lib/brand";
import { themeBootstrapScript } from "@vxture/design-system";
import { Providers } from "./providers";
import "@vxture/design-system/styles/globals.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ruyin.ai"),
  title: `${ruyinBrand.fullName} ${ruyinBrand.productName}`,
  description: ruyinBrand.description,
  icons: {
    icon: "/assets/icons/ruyin-icon-32.svg",
    apple: "/assets/icons/ruyin-icon-180.svg",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: `${ruyinBrand.productName} - ${ruyinBrand.fullName}`,
    description: ruyinBrand.description,
    siteName: ruyinBrand.productName,
    images: [{ url: "/assets/social/ruyin-og-image.svg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${ruyinBrand.productName} - ${ruyinBrand.fullName}`,
    description: ruyinBrand.description,
    images: ["/assets/social/ruyin-twitter-card.svg"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
