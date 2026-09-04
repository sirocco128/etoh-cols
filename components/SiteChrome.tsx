"use client";

import { usePathname } from "next/navigation";

/** Hide public chrome on /ops console routes. */
export function SiteChrome({
  children,
  chrome,
}: {
  children: React.ReactNode;
  chrome: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const isOps = pathname === "/ops" || pathname.startsWith("/ops/");
  if (isOps) return <>{children}</>;
  return (
    <>
      {chrome}
      {children}
    </>
  );
}
