import type { Metadata } from "next";
import { P2ComingSoon } from "@/components/P2ComingSoon";
import { QuoteBasketPanel } from "@/components/QuoteBasketPanel";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";

export const metadata: Metadata = {
  title: "ตะกร้าใบเสนอราคา",
  description:
    "รวบรวมสินค้าหลายรายการก่อนส่งคำขอใบเสนอราคา Gift Set องค์กร",
  alternates: { canonical: "/quote-basket" },
  robots: { index: false, follow: false },
};

export default function QuoteBasketPage() {
  if (!isP2QuoteToolsEnabled()) {
    return (
      <P2ComingSoon
        title="ตะกร้าใบเสนอราคายังไม่พร้อม"
        description="ขณะนี้ยังเปิดใช้เฉพาะแบบฟอร์มขอใบเสนอราคาหลัก คุณยังเลือกสินค้าแล้วกดขอราคาได้ตามปกติ"
      />
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16">
      <QuoteBasketPanel />
    </div>
  );
}
