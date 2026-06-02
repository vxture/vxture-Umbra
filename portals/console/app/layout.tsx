import type { Metadata } from "next";
import type { ReactNode } from "react";
import { themeBootstrapScript } from "@vxture/design-system";
import "@vxture/design-system/styles/globals.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ruyin Account",
  description: "Ruyin VPN account portal",
  icons: {
    icon: "/assets/icons/ruyin-icon-64.svg",
    apple: "/assets/icons/ruyin-icon-180.svg",
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
