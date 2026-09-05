import Link from "next/link";
import type { Metadata } from "next";
import { getOpsActor, isOpsAuthConfigured } from "@/lib/ops-auth";
import { buildOpsNavLinks, opsActorLabel } from "@/lib/ops-nav";
import { OpsNav } from "@/components/OpsNav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "คอนโซลปฏิบัติการ",
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          {actor ? (
            <OpsNav actorLabel={opsActorLabel(actor)} links={buildOpsNavLinks(actor)} />
          ) : (
            <Link href="/ops" className="text-lg font-semibold tracking-tight">
              คอนโซลปฏิบัติการ
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </div>
  );
}
