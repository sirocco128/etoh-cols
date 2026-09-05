"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const isOps = pathname === "/ops" || pathname.startsWith("/ops/");

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      forcedTheme={isOps ? "light" : undefined}
    >
      {children}
    </NextThemesProvider>
  );
}
