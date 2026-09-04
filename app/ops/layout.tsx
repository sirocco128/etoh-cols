import Link from "next/link";
import type { Metadata } from "next";
import { requireOpsSession, isOpsAuthConfigured } from "@/lib/ops-auth";
import { opsLogoutAction } from "@/app/actions/ops";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Ops Console",
};

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isOpsAuthConfigured();
  const authed = configured ? await requireOpsSession() : false;

  return (
    <div className="min-h-screen bg-forest-mist/40 text-ink">
      <header className="border-b border-forest/10 bg-forest text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/ops" className="text-lg font-semibold tracking-tight">
              Ops Console
            </Link>
            {authed ? (
              <nav className="flex gap-3 text-sm text-paper/85">
                <Link href="/ops/quotes" className="hover:text-brass-soft">
                  ใบเสนอราคา
                </Link>
                <Link href="/ops/customers" className="hover:text-brass-soft">
                  ลูกค้า
                </Link>
                <Link href="/ops/catalog-images" className="hover:text-brass-soft">
                  รูปโรงงาน
                </Link>
                <Link href="/" className="hover:text-brass-soft">
                  เว็บสาธารณะ
                </Link>
              </nav>
            ) : null}
          </div>
          {authed ? (
            <form action={opsLogoutAction}>
              <button
                type="submit"
                className="rounded border border-paper/30 px-3 py-1.5 text-sm hover:bg-forest-light"
              >
                ออกจากระบบ
              </button>
            </form>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
