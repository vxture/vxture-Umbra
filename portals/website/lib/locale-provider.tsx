"use client";

/**
 * Re-export of the shared locale provider so the website shares ONE locale
 * React context with `@umbra/shared` (the i18n `I18nProvider` reads the shared
 * `useLocale`). This file used to carry an identical local copy; keeping the
 * `@/lib/locale-provider` path lets the website components import it unchanged.
 */
export { LocaleProvider, useLocale } from "@umbra/shared/locale-provider";
