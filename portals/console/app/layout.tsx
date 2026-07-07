import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Funnel_Display } from "next/font/google";
import { preferenceBootstrapScript } from "@umbra/shared/preferences";
import "@vxture/design-system/styles/globals.css";
import "@vxture/design-system/styles/brands/umbra.css";
import "./globals.css";
import { Providers } from "@umbra/shared/providers";
import { I18nProvider } from "@umbra/shared/i18n";
import { messages } from "../messages";

/** DS brand typeface (Funnel Display) wired to the DS brand-font loader slot. */
const brandFont = Funnel_Display({
  subsets: ["latin"],
  variable: "--vx-font-loader-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Umbra Account",
  description: "Umbra VPN account portal",
  icons: {
    icon: "/favicon.ico",
    apple: "/assets/brand/umbra-symbol-dark.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" className={brandFont.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferenceBootstrapScript }} />
      </head>
      <body>
        <Providers>
          <I18nProvider messages={messages}>{children}</I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
