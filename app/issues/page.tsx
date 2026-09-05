import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { IssueReportForm } from "@/components/IssueReportForm";
import { ISSUE_REPORT_INTRO } from "@/lib/ux-copy";

export const metadata: Metadata = {
  title: "แจ้งปัญหาสินค้า",
  robots: { index: false, follow: false },
};

export default function IssuesPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <Breadcrumbs items={[{ label: "แจ้งปัญหา" }]} />
      <h1 className="text-3xl font-bold text-forest">แจ้งปัญหาสินค้า</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/80">{ISSUE_REPORT_INTRO}</p>
      <div className="mt-8">
        <IssueReportForm />
      </div>
    </div>
  );
}
