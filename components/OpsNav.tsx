"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { opsLogoutAction } from "@/app/actions/ops";
import { isOpsNavActive, type OpsNavLink } from "@/lib/ops-nav";
import { cn } from "@/lib/utils";

export function OpsNav({
  actorLabel,
  links,
}: {
  actorLabel: string;
  links: OpsNavLink[];
}) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const primary = links.filter((link) => link.group === "primary");
  const more = links.filter((link) => link.group === "more");
  const moreActive = more.some((link) => isOpsNavActive(pathname, link.href));

  function itemClass(href: string) {
    const active = isOpsNavActive(pathname, href);
    return cn(
      "rounded px-2 py-1 hover:text-brass-soft",
      active && "bg-paper/15 text-brass-soft",
    );
  }

  return (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        <Link href="/ops" className="shrink-0 text-lg font-semibold tracking-tight">
          คอนโซลปฏิบัติการ
        </Link>
        <nav className="hidden flex-wrap items-center gap-2 text-sm text-paper/85 lg:flex" aria-label="เมนูปฏิบัติการ">
          {primary.map((link) => (
            <Link key={link.href} href={link.href} className={itemClass(link.href)}>
              {link.label}
            </Link>
          ))}
          {more.length ? (
            <details className="relative">
              <summary className={cn("cursor-pointer list-none rounded px-2 py-1 hover:text-brass-soft", moreActive && "text-brass-soft")}>
                เพิ่มเติม
              </summary>
              <div className="absolute left-0 z-20 mt-1 min-w-[12rem] rounded-lg border border-forest/20 bg-forest py-1 shadow-lg">
                {more.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn("block px-3 py-2 text-sm hover:bg-forest-light", isOpsNavActive(pathname, link.href) && "text-brass-soft")}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </nav>
        <button
          type="button"
          className="rounded border border-paper/30 px-3 py-1.5 text-sm lg:hidden"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "ปิดเมนู" : "เมนู"}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-paper/75 sm:inline">{actorLabel}</span>
        <form action={opsLogoutAction}>
          <button
            type="submit"
            className="rounded border border-paper/30 px-3 py-1.5 text-sm hover:bg-forest-light"
          >
            ออกจากระบบ
          </button>
        </form>
      </div>
      {open ? (
        <nav className="flex w-full flex-col gap-1 border-t border-paper/15 pt-3 text-sm lg:hidden" aria-label="เมนูมือถือปฏิบัติการ">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("rounded px-2 py-2", isOpsNavActive(pathname, link.href) && "bg-paper/15 text-brass-soft")}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
