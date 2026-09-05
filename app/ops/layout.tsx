import Link from "next/link";
import type { Metadata } from "next";
import { actorMay, getOpsActor, isOpsAuthConfigured } from "@/lib/ops-auth";
import { ROLE_LABELS } from "@/lib/ops-roles";
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
  const actor = configured ? await getOpsActor() : null;

  return (
    <div className="min-h-screen bg-forest-mist/40 text-ink">
      <header className="border-b border-forest/10 bg-forest text-paper print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/ops" className="text-lg font-semibold tracking-tight">
              Ops Console
            </Link>
            {actor ? (
              <nav className="flex flex-wrap gap-3 text-sm text-paper/85">
                <Link href="/ops/quotes" className="hover:text-brass-soft">
                  ใบเสนอราคา
                </Link>
                <Link href="/ops/orders" className="hover:text-brass-soft">
                  ออเดอร์ / รับชำระ
                </Link>
                <Link href="/ops/approvals" className="hover:text-brass-soft">
                  อนุมัติยอด
                </Link>
                <Link href="/ops/cycle" className="hover:text-brass-soft">
                  ปฏิบัติการ
                </Link>
                {actorMay(actor, "factory.read") ? (
                  <Link href="/ops/factory-po" className="hover:text-brass-soft">
                    ใบสั่งโรงงาน
                  </Link>
                ) : null}
                <Link href="/ops/customers" className="hover:text-brass-soft">
                  ลูกค้า
                </Link>
                {actorMay(actor, "customers.write") ? (
                  <Link href="/ops/line-lab" className="hover:text-brass-soft">
                    ทดลองไลน์
                  </Link>
                ) : null}
                {actorMay(actor, "finance.read") ? (
                  <Link href="/ops/finance" className="hover:text-brass-soft">
                    งบผู้บริหาร
                  </Link>
                ) : null}
                <Link href="/ops/seo" className="hover:text-brass-soft">
                  SEO
                </Link>
                {actorMay(actor, "catalog.write") ? (
                  <Link href="/ops/catalog-images" className="hover:text-brass-soft">
                    รูปโรงงาน
                  </Link>
                ) : null}
                {actorMay(actor, "assistant.use") ? (
                  <Link href="/ops/assistant" className="hover:text-brass-soft">
                    ผู้ช่วยเซลล์
                  </Link>
                ) : null}
                {actorMay(actor, "audit.read") ? (
                  <Link href="/ops/audit" className="hover:text-brass-soft">
                    บันทึกการใช้งาน
                  </Link>
                ) : null}
                {actorMay(actor, "users.read") ? (
                  <Link href="/ops/users" className="hover:text-brass-soft">
                    ผู้ใช้ / สิทธิ์
                  </Link>
                ) : null}
                <Link href="/" className="hover:text-brass-soft">
                  เว็บสาธารณะ
                </Link>
              </nav>
            ) : null}
          </div>
          {actor ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-paper/75">
                {actor.email} · {ROLE_LABELS[actor.role]}
              </span>
              <form action={opsLogoutAction}>
                <button
                  type="submit"
                  className="rounded border border-paper/30 px-3 py-1.5 text-sm hover:bg-forest-light"
                >
                  ออกจากระบบ
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </div>
  );
}
