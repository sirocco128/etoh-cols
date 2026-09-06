import { NextResponse } from "next/server";
import { lookupCompanyByTaxId } from "@/lib/company-lookup";
import { getCustomerByTaxId } from "@/lib/customer-repository";
import { allowPublicLookup } from "@/lib/public-api-limit";
import { normalizeThaiTaxId } from "@/lib/th-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!allowPublicLookup(request, "company-lookup")) {
    return NextResponse.json(
      { ok: false, error: "ค้นหาบ่อยเกินไป ลองใหม่ในอีกสักครู่" },
      { status: 429 },
    );
  }

  const taxId = new URL(request.url).searchParams.get("taxId") || "";
  let localRecord = null;
  try {
    const normalized = normalizeThaiTaxId(taxId);
    const customer = normalized ? getCustomerByTaxId(normalized) : null;
    if (customer) {
      localRecord = {
        taxId: customer.taxId || normalized || "",
        name: customer.company,
        address: customer.billingAddress,
        province: customer.defaultShipProvince,
        source: "crm" as const,
        branches: [
          {
            code: "0",
            label: customer.billingBranch || "สำนักงานใหญ่",
            address: customer.billingAddress,
            province: customer.defaultShipProvince,
          },
        ],
      };
    }
  } catch {
    localRecord = null;
  }

  const result = await lookupCompanyByTaxId(taxId, { localRecord });
  const status =
    result.ok ? 200 : result.code === "invalid" ? 400 : result.code === "upstream" ? 502 : 404;
  return NextResponse.json(result, { status });
}
