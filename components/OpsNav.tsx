/*
 * UI/UX Design Brief — DesignLint v1.2
 * ──────────────────────────────────────────────
 *
 * — Context —
 * User:        พนักงานขาย/บัญชี/คลังในคอนโซลปฏิบัติการ — รีบ ต้องเจอหน้างานใน 2 คลิก
 * Tension:     Dense BUT calm (ทุกเมนูอยู่ข้างซ้าย แต่จัดตามขั้นงาน ไม่ใช่รายการยาว)
 * Archetype:   Linear — Keep: density + current page rail. Discard: dump-into-More.
 *              Add: กลุ่มตามวงจรงานของขวัญองค์กร (ขาย → ราคา → ปฏิบัติการ → บัญชี)
 *
 * — UI —
 * Aesthetic:   Utilitarian — same forest/brass chrome, no new brand fonts
 * Type:        inherit storefront (ops stays in existing shell)
 * Palette:     forest / forest-light / brass-soft / paper — existing ops-shell tokens
 * Spatial:     Dense utility left rail; content keeps max-w-6xl
 * Motion:      Mechanical 150ms — drawer only, no fade-on-everything
 * Signature:   Brass left rail on the active item (pressed-key, not a pill)
 *
 * — UX —
 * Navigation:  Work-stage sidebar (not a flat top wrap + “เพิ่มเติม”)
 * Interaction: Filter-in-place “หาเมนู” — no command palette overlay
 * Feedback:    aria-current=page; drawer closes on navigate
 *
 * — Voice —
 * Tone:        Formal + terse. CTA=ออกจากระบบ, Empty=ไม่มีเมนูที่ตรง
 *
 * — Departure —
 * Groups named as job stages, not SaaS modules (วันนี้ / ขาย / ราคา / วงจร / บัญชี)
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Menu, Search, X } from "lucide-react";
import { opsLogoutAction } from "@/app/actions/ops";
import {
  filterOpsNavGroups,
  groupOpsNavLinks,
  isOpsNavActive,
  type OpsNavLink,
} from "@/lib/ops-nav";
import { cn } from "@/lib/utils";

function NavItem({
  link,
  className,
  onClick,
  active,
}: {
  link: OpsNavLink;
  className: string;
  onClick?: () => void;
  active: boolean;
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        title="เปิดแท็บใหม่"
        aria-label={`${link.label} เปิดแท็บใหม่`}
        onClick={onClick}
      >
        {link.label}
        <span className="ml-1 text-[0.65rem] opacity-70" aria-hidden>
          ↗
        </span>
      </a>
    );
  }
  return (
    <Link
      href={link.href}
      className={className}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {link.label}
    </Link>
  );
}

function SidebarBody({
  links,
  pathname,
  onNavigate,
  searchId,
}: {
  links: OpsNavLink[];
  pathname: string;
  onNavigate?: () => void;
  searchId: string;
}) {
  const [query, setQuery] = useState("");
  const groups = useMemo(
    () => filterOpsNavGroups(groupOpsNavLinks(links), query),
    [links, query],
  );

  return (
    <>
      <div className="px-3 pt-3">
        <label htmlFor={searchId} className="sr-only">
          หาเมนู
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-paper/45"
            aria-hidden
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="หาเมนู…"
            autoComplete="off"
            className="h-9 w-full rounded-lg border border-paper/15 bg-forest-light/80 pl-8 pr-2.5 text-sm text-paper placeholder:text-paper/40 outline-none ring-brass-soft/40 focus:ring-2"
          />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="เมนูปฏิบัติการ">
        {groups.length ? (
          groups.map((group) => (
            <section key={group.id} className="mb-3">
              <h2 className="px-2 pb-1 text-[0.7rem] font-semibold tracking-wide text-brass-soft/90">
                {group.label}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {group.links.map((link) => {
                  const active = isOpsNavActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <NavItem
                        link={link}
                        active={active}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center border-l-[3px] border-transparent py-1.5 pl-2 pr-2 text-[0.8125rem] leading-snug text-paper/80 hover:bg-paper/10 hover:text-paper",
                          active &&
                            "border-brass-soft bg-paper/12 font-medium text-brass-soft",
                        )}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <p className="px-2 py-4 text-sm text-paper/55">ไม่มีเมนูที่ตรง — ลองคำอื่น</p>
        )}
      </nav>
    </>
  );
}

export function OpsNav({
  actorLabel,
  links,
  children,
}: {
  actorLabel: string;
  links: OpsNavLink[];
  children: ReactNode;
}) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const searchId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-dvh">
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="ปิดเมนู"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="ops-sidebar"
        className={cn(
          "z-50 flex w-[16.5rem] shrink-0 flex-col border-r border-white/10 bg-forest text-paper print:hidden",
          "pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:transition-[transform] max-lg:duration-150 max-lg:ease-[cubic-bezier(0.2,0,0,1)]",
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "lg:sticky lg:top-0 lg:z-20 lg:h-dvh",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-3 lg:px-4">
          <Link href="/ops" className="min-w-0 text-[0.95rem] font-semibold tracking-tight">
            คอนโซลปฏิบัติการ
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-paper/20 lg:hidden"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <SidebarBody
          links={links}
          pathname={pathname}
          searchId={searchId}
          onNavigate={() => setOpen(false)}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-forest/10 bg-forest px-page py-2.5 text-paper print:hidden pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-paper/30 px-3 py-1.5 text-sm lg:hidden"
              aria-expanded={open}
              aria-controls="ops-sidebar"
              onClick={() => setOpen(true)}
            >
              <Menu className="h-4 w-4" aria-hidden />
              เมนู
            </button>
            <Link href="/ops" className="truncate text-sm font-semibold tracking-tight lg:hidden">
              คอนโซลปฏิบัติการ
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[10rem] truncate text-xs text-paper/75 sm:inline md:max-w-none">
              {actorLabel}
            </span>
            <form action={opsLogoutAction}>
              <button
                type="submit"
                className="min-h-11 rounded-xl border border-paper/30 px-3 py-1.5 text-sm hover:bg-forest-light"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 overflow-x-auto px-page py-6 sm:py-8 print:max-w-none print:overflow-visible print:px-0 print:py-0">
          {children}
        </main>
      </div>
    </div>
  );
}
