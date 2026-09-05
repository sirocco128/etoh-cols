"use client";

import type { ReactNode } from "react";

/** Light-only site — skip next-themes so `<html>` class does not mismatch on hydrate. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return children;
}
