"use client";

import type { ReactNode } from "react";
import { FullscreenProvider, ThemeProvider } from "@vxture/design-system";
import { LocaleProvider } from "@/lib/locale-provider";
import { PreferenceSync } from "@/components/preference-sync";

/**
 * Root providers for the Ruyin website.
 *
 * - ThemeProvider from @vxture/design-system wraps next-themes and adds density.
 * - LocaleProvider manages en-US / zh-CN / ja-JP toggling (UmbraLocale superset of @vxture/shared).
 * - FullscreenProvider backs the header's ShellFullscreenToggle (page fullscreen).
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultMode="system" defaultDensity="default">
      <LocaleProvider>
        <FullscreenProvider>
          <PreferenceSync />
          {children}
        </FullscreenProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
