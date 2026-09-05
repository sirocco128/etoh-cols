/**
 * Lookup a Thai juristic person by 13-digit registration / tax ID.
 * Order: local CRM → Revenue Department VAT (public) → MOC/DBD juristic.
 * Optional: DBD Open API when DBD_OPENAPI_KEY is set.
 */

import { isValidThaiTaxId, normalizeThaiTaxId } from "@/lib/th-billing";
import { matchThaiAddressParts } from "@/lib/thai-address";

export type CompanyLookupSource = "crm" | "rd_vat" | "dbd_moc" | "dbd_openapi";

const RD_VAT_URL = "https://rdws.rd.go.th/serviceRD3/vatserviceRD3.asmx";
const RD_VAT_NS = "https://rdws.rd.go.th/serviceRD3/vatserviceRD3";

export type CompanyRecord = {
  taxId: string;
  name: string;
  nameEn?: string | null;
  status?: string | null;
  address?: string | null;
  streetAddress?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  zip?: string | null;
  source: CompanyLookupSource;
};

export type CompanyLookupOk = { ok: true } & CompanyRecord;

export type CompanyLookupFail = {
  ok: false;
  code: "invalid" | "not_found" | "upstream";
  error: string;
};

export type CompanyLookupResult = CompanyLookupOk | CompanyLookupFail;

type FetchLike = typeof fetch;

type MocJuristic = {
  juristicID?: string;
  juristicNameTH?: string;
  juristicNameEN?: string;
  juristicStatus?: string;
  addressDetail?: {
    houseNumber?: string;
    moo?: string;
    soi?: string;
    street?: string;
    subDistrict?: string;
    district?: string;
    province?: string;
  };
};

function joinAddress(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts
    .map((part) => String(part || "").trim())
    .filter((part) => part && part !== "-");
  return cleaned.length ? cleaned.join(" ") : null;
}

function soapField(xml: string, tag: string): string {
  const block = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  const inner = block?.[1];
  if (!inner) return "";
  const any = inner.match(/<anyType\b[^>]*>([\s\S]*?)<\/anyType>/i);
  const raw = (any?.[1] ?? inner).replace(/<[^>]+>/g, "").trim();
  if (!raw || raw === "-") return "";
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

export function parseRdVatSoap(xml: string, taxId: string): CompanyRecord | null {
  if (soapField(xml, "vmsgerr")) return null;
  const title =
    soapField(xml, "vtitleName") || soapField(xml, "vBranchTitleName");
  const name = soapField(xml, "vName") || soapField(xml, "vBranchName");
  if (!name) return null;
  const province = soapField(xml, "vProvince");
  const district = soapField(xml, "vAmphur");
  const subdistrict = soapField(xml, "vThambol");
  const moo = soapField(xml, "vMooNumber");
  const soi = soapField(xml, "vSoiName");
  const street = soapField(xml, "vStreetName");
  const house = soapField(xml, "vHouseNumber");
  const postCode = soapField(xml, "vPostCode");
  const streetLine = joinAddress([
    house,
    moo ? `หมู่ ${moo}` : "",
    soi ? `ซอย${soi}` : "",
    street ? `ถ.${street}` : "",
  ]);
  const matched = matchThaiAddressParts({ province, district, subdistrict });
  return {
    taxId,
    name: [title, name].filter(Boolean).join(" "),
    nameEn: null,
    status: soapField(xml, "vBusinessFirstDate")
      ? "จดทะเบียนภาษีมูลค่าเพิ่ม"
      : null,
    streetAddress: streetLine,
    address: joinAddress([
      streetLine,
      subdistrict,
      district,
      province,
      postCode,
    ]),
    province: matched.province || province || null,
    district: matched.district || district || null,
    subdistrict: matched.subdistrict || subdistrict || null,
    zip: postCode || matched.zip || null,
    source: "rd_vat",
  };
}

async function fetchJson(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function fromMoc(payload: MocJuristic, taxId: string): CompanyRecord | null {
  const name = String(payload.juristicNameTH || "").trim();
  if (!name) return null;
  const detail = payload.addressDetail;
  const matched = matchThaiAddressParts({
    province: detail?.province,
    district: detail?.district,
    subdistrict: detail?.subDistrict,
  });
  const streetLine = joinAddress([
    detail?.houseNumber,
    detail?.moo ? `หมู่ ${detail.moo}` : "",
    detail?.soi ? `ซอย${detail.soi}` : "",
    detail?.street ? `ถ.${detail.street}` : "",
  ]);
  return {
    taxId,
    name,
    nameEn: payload.juristicNameEN || null,
    status: payload.juristicStatus || null,
    streetAddress: streetLine,
    address: joinAddress([
      streetLine,
      detail?.subDistrict,
      detail?.district,
      detail?.province,
    ]),
    province: matched.province || detail?.province || null,
    district: matched.district || detail?.district || null,
    subdistrict: matched.subdistrict || detail?.subDistrict || null,
    zip: matched.zip || null,
    source: "dbd_moc",
  };
}

async function lookupRdVat(
  taxId: string,
  fetchImpl: FetchLike,
): Promise<CompanyRecord | null> {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:vat="${RD_VAT_NS}">
  <soap:Header/>
  <soap:Body>
    <vat:Service>
      <vat:username>anonymous</vat:username>
      <vat:password>anonymous</vat:password>
      <vat:TIN>${taxId}</vat:TIN>
      <vat:Name></vat:Name>
      <vat:ProvinceCode>0</vat:ProvinceCode>
      <vat:BranchNumber>0</vat:BranchNumber>
      <vat:AmphurCode>0</vat:AmphurCode>
    </vat:Service>
  </soap:Body>
</soap:Envelope>`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetchImpl(RD_VAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        SOAPAction: `${RD_VAT_NS}/Service`,
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const xml = await response.text();
    return parseRdVatSoap(xml, taxId);
  } finally {
    clearTimeout(timer);
  }
}

async function lookupMoc(
  taxId: string,
  fetchImpl: FetchLike,
): Promise<CompanyRecord | null> {
  const url = `https://dataapi.moc.go.th/juristic?juristic_id=${encodeURIComponent(taxId)}`;
  const payload = (await fetchJson(
    url,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "terabis-quote-form",
      },
    },
        fetchImpl,
        6_000,
      )) as MocJuristic;
  return fromMoc(payload, taxId);
}

async function lookupDbdOpenApi(
  taxId: string,
  fetchImpl: FetchLike,
): Promise<CompanyRecord | null> {
  const key = (process.env.DBD_OPENAPI_KEY || "").trim();
  if (!key) return null;
  const base = (
    process.env.DBD_OPENAPI_URL || "https://openapi.dbd.go.th"
  ).replace(/\/+$/, "");
  const payload = (await fetchJson(
    `${base}/v1/juristic/${encodeURIComponent(taxId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Consumer-Key": key,
      },
    },
        fetchImpl,
        6_000,
      )) as Record<string, unknown>;
  const data =
    payload && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : payload;
  const name = String(
    data?.juristicNameTH || data?.nameTh || data?.name || "",
  ).trim();
  if (!name) return null;
  return {
    taxId,
    name,
    nameEn: String(data?.juristicNameEN || data?.nameEn || "") || null,
    status: String(data?.juristicStatus || data?.status || "") || null,
    address: String(data?.address || "") || null,
    source: "dbd_openapi",
  };
}

export async function lookupCompanyByTaxId(
  raw: string,
  options?: {
    fetchImpl?: FetchLike;
    localRecord?: CompanyRecord | null;
    /** Wait this long for Revenue Department before accepting MOC (default 1.2s). */
    preferRdMs?: number;
  },
): Promise<CompanyLookupResult> {
  const taxId = normalizeThaiTaxId(raw);
  if (!taxId || !isValidThaiTaxId(taxId)) {
    return {
      ok: false,
      code: "invalid",
      error: "เลขทะเบียนนิติบุคคลต้องเป็นตัวเลข 13 หลักที่ถูกต้อง",
    };
  }

  if (options?.localRecord?.name) {
    return { ok: true, ...options.localRecord, taxId, source: "crm" };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const errors: string[] = [];
  const preferRdMs = Math.max(0, options?.preferRdMs ?? 1_200);

  const rdTask = lookupRdVat(taxId, fetchImpl).catch((error) => {
    errors.push(error instanceof Error ? error.message : "rd");
    return null;
  });
  const mocTask = lookupMoc(taxId, fetchImpl).catch((error) => {
    errors.push(error instanceof Error ? error.message : "moc");
    return null;
  });

  let waitTimer: ReturnType<typeof setTimeout> | undefined;
  const rdQuick = await Promise.race([
    rdTask,
    new Promise<null>((resolve) => {
      waitTimer = setTimeout(() => resolve(null), preferRdMs);
    }),
  ]);
  if (waitTimer) clearTimeout(waitTimer);
  if (rdQuick) return { ok: true, ...rdQuick };

  const moc = await mocTask;
  if (moc) return { ok: true, ...moc };

  const rd = await rdTask;
  if (rd) return { ok: true, ...rd };

  try {
    const dbd = await lookupDbdOpenApi(taxId, fetchImpl);
    if (dbd) return { ok: true, ...dbd };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "dbd");
  }

  if (errors.length) {
    return {
      ok: false,
      code: "upstream",
      error:
        "ค้นหาจากกรมสรรพากรและกรมพัฒนาธุรกิจการค้าไม่สำเร็จในตอนนี้ กรอกชื่อบริษัทเองได้",
    };
  }

  return {
    ok: false,
    code: "not_found",
    error: "ไม่พบบริษัทจากเลขทะเบียนนี้ กรอกชื่อบริษัทเองได้",
  };
}
