import Link from "next/link";
import { EtohQuoteCalculator } from "@/components/etoh/EtohQuoteCalculator";
import { EtohSubnav } from "@/components/etoh/EtohSubnav";
import { actorMay, requireOpsPage } from "@/lib/ops-auth";
import { currentPrices } from "@/lib/etoh/repository";
import { listEtohCustomerOptions } from "@/lib/etoh/ops-data";
import { ETOH_GRADES, type EtohGradeCode } from "@/lib/etoh/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EtohCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const actor = await requireOpsPage("quotes.read");
  const sp = await searchParams;
  const prices = currentPrices();
  const pricedGrades = ETOH_GRADES.map((g) => g.code).filter((code) => prices[code]) as EtohGradeCode[];
  const customers = listEtohCustomerOptions();
  const canEditPrices = actorMay(actor, "catalog.write");

  return (
    <div>
      <h1 className="text-2xl font-bold text-forest">คิดราคาเอทานอล</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink/70">
        เลือกลูกค้า เกรด และบรรจุภัณฑ์ ระบบคิดส่วนลดตามระดับลูกค้าหรือปริมาณ (ใช้ระดับที่ดีกว่าให้อัตโนมัติ)
        แยกมัดจำภาชนะออกจากฐาน VAT แล้วบันทึกเป็นใบเสนอราคาได้ทันที
      </p>
      <EtohSubnav current="calc" />
      {pricedGrades.length === 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          ยังไม่มีราคาฐานต่อลิตรของเกรดใดเลย
          {canEditPrices ? (
            <>
              {" "}
              —{" "}
              <Link href="/ops/etoh/prices" className="font-medium underline">
                ตั้งราคาก่อน
              </Link>
            </>
          ) : (
            " — แจ้งหัวหน้าฝ่ายขายให้ตั้งราคา"
          )}
        </div>
      ) : (
        <div className="mt-6">
          <EtohQuoteCalculator
            customers={customers}
            pricedGrades={pricedGrades}
            canSave={actorMay(actor, "quotes.write")}
            canOverride={actorMay(actor, "quotes.write")}
            initialCustomerId={Number(sp.customer) || undefined}
          />
        </div>
      )}
    </div>
  );
}
