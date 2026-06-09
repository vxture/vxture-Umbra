"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@vxture/design-system";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider defaultMode="system" defaultDensity="default">
      {children}
    </ThemeProvider>
  );
}
