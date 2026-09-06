"use client";

import { COMPANY_TAX_LOOKUP_HINT } from "@/lib/ux-copy";
import { isValidThaiTaxId } from "@/lib/th-billing";
import { useCallback, useEffect, useRef, useState } from "react";

export type CompanyLookupBranch = {
  code: string;
  label: string;
  streetAddress?: string | null;
  province?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  zip?: string | null;
  address?: string | null;
};

export type CompanyLookupFill = {
  taxId: string;
  company: string;
  billingBranch?: string;
  streetAddress?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  zip?: string;
};

type CompanyLookupFieldProps = {
  taxId: string;
  company: string;
  billingBranch?: string;
  taxError?: string;
  companyError?: string;
  onTaxIdChange: (value: string) => void;
  onCompanyChange: (value: string) => void;
  onFill: (fill: CompanyLookupFill) => void;
};

function addressFromBranch(branch: CompanyLookupBranch): Partial<CompanyLookupFill> {
  return {
    ...(branch.streetAddress ? { streetAddress: branch.streetAddress } : {}),
    ...(branch.province ? { province: branch.province } : {}),
    ...(branch.district ? { district: branch.district } : {}),
    ...(branch.subdistrict ? { subdistrict: branch.subdistrict } : {}),
    ...(branch.zip ? { zip: branch.zip } : {}),
  };
}

export function CompanyLookupField({
  taxId,
  company,
  billingBranch = "",
  taxError,
  companyError,
  onTaxIdChange,
  onCompanyChange,
  onFill,
}: CompanyLookupFieldProps) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const [branches, setBranches] = useState<CompanyLookupBranch[]>([]);
  const lastLookup = useRef("");
  const onFillRef = useRef(onFill);
  const billingBranchRef = useRef(billingBranch);
  onFillRef.current = onFill;
  billingBranchRef.current = billingBranch;

  const lookup = useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!isValidThaiTaxId(digits) || lastLookup.current === digits) return;
    lastLookup.current = digits;
    setPending(true);
    setStatus("กำลังค้นหาบริษัทจากเลขทะเบียน… ถ้าช้า กรอกชื่อเองได้");
    try {
      const response = await fetch(
        `/api/company-lookup?taxId=${encodeURIComponent(digits)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as {
        ok?: boolean;
        name?: string;
        taxId?: string;
        streetAddress?: string;
        province?: string;
        district?: string;
        subdistrict?: string;
        zip?: string;
        status?: string;
        error?: string;
        source?: string;
        branches?: CompanyLookupBranch[];
      };
      if (!json.ok || !json.name) {
        setBranches([]);
        setStatus(json.error || "ไม่พบบริษัทจากเลขนี้ กรอกชื่อเองได้");
        return;
      }
      const nextBranches = Array.isArray(json.branches) ? json.branches : [];
      setBranches(nextBranches);
      const hq = nextBranches[0];
      const previous = billingBranchRef.current;
      const preserved = nextBranches.find((branch) => branch.label === previous);
      const chosen = preserved || hq;
      onFillRef.current({
        taxId: json.taxId || digits,
        company: json.name,
        billingBranch: chosen?.label || "สำนักงานใหญ่",
        streetAddress: chosen?.streetAddress || json.streetAddress,
        province: chosen?.province || json.province,
        district: chosen?.district || json.district,
        subdistrict: chosen?.subdistrict || json.subdistrict,
        zip: chosen?.zip || json.zip,
      });
      const sourceLabel =
        json.source === "crm"
          ? "จากลูกค้าเดิมในระบบ"
          : json.source === "rd_vat"
            ? "จากกรมสรรพากร"
            : "จากกรมพัฒนาธุรกิจการค้า";
      const running = json.status ? ` · สถานะ ${json.status}` : "";
      const branchNote =
        nextBranches.length > 1
          ? ` · พบ ${nextBranches.length} สาขา ให้เลือกสาขาที่ออกใบกำกับภาษี`
          : "";
      setStatus(`พบ ${json.name} (${sourceLabel}${running}${branchNote})`);
    } catch {
      setBranches([]);
      setStatus("ค้นหาไม่สำเร็จในตอนนี้ กรอกชื่อบริษัทเองได้");
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    const digits = taxId.replace(/\D/g, "");
    if (digits.length !== 13) {
      lastLookup.current = "";
      setBranches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void lookup(digits);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [taxId, lookup]);

  const selectedLabel = billingBranch || "สำนักงานใหญ่";
  const showBranchSelect = branches.length > 1;

  return (
    <div className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="taxId" className="mb-1.5 block text-sm font-medium text-ink">
          เลขทะเบียนนิติบุคคล / เลขผู้เสียภาษี
        </label>
        <div className="flex gap-2">
          <input
            id="taxId"
            name="taxId"
            inputMode="numeric"
            autoComplete="off"
            value={taxId}
            onChange={(event) => onTaxIdChange(event.target.value.replace(/\D/g, "").slice(0, 13))}
            placeholder="13 หลัก"
            className="min-h-11 w-full rounded-xl border border-forest/20 bg-paper px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            aria-invalid={Boolean(taxError)}
            aria-describedby={taxError ? "taxId-error" : "taxId-hint"}
          />
          <button
            type="button"
            disabled={pending || taxId.replace(/\D/g, "").length !== 13}
            onClick={() => {
              lastLookup.current = "";
              void lookup(taxId);
            }}
            className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-forest/20 px-4 text-sm font-semibold text-forest disabled:opacity-50"
          >
            {pending ? "ค้นหา…" : "ค้นหาบริษัท"}
          </button>
        </div>
        <p id="taxId-hint" className="mt-1 text-xs text-ink/55">
          {COMPANY_TAX_LOOKUP_HINT}
        </p>
        {status ? <p className="mt-1 text-xs text-forest">{status}</p> : null}
        {taxError ? (
          <p id="taxId-error" className="mt-1 text-sm text-red-700">
            {taxError}
          </p>
        ) : null}
      </div>
      <div>
        <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-ink">
          บริษัท / องค์กร *
        </label>
        <input
          id="company"
          name="company"
          required
          autoComplete="organization"
          value={company}
          onChange={(event) => onCompanyChange(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-forest/20 bg-paper px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          aria-invalid={Boolean(companyError)}
          aria-describedby={companyError ? "company-error" : undefined}
        />
        {companyError ? (
          <p id="company-error" className="mt-1 text-sm text-red-700">
            {companyError}
          </p>
        ) : null}
      </div>
    </div>
    {showBranchSelect ? (
      <div>
        <label htmlFor="billingBranch" className="mb-1.5 block text-sm font-medium text-ink">
          สาขาที่ออกใบกำกับภาษี *
        </label>
        <select
          id="billingBranch"
          name="billingBranch"
          value={
            branches.some((branch) => branch.label === selectedLabel)
              ? selectedLabel
              : branches[0]?.label || "สำนักงานใหญ่"
          }
          onChange={(event) => {
            const picked =
              branches.find((branch) => branch.label === event.target.value) ||
              branches[0];
            if (!picked) return;
            onFill({
              taxId,
              company,
              billingBranch: picked.label,
              ...addressFromBranch(picked),
            });
          }}
          className="min-h-11 w-full rounded-xl border border-forest/20 bg-paper px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        >
          {branches.map((branch) => (
            <option key={`${branch.code}-${branch.label}`} value={branch.label}>
              {branch.label}
              {branch.streetAddress ? ` — ${branch.streetAddress}` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink/55">
          เลือกสำนักงานใหญ่หรือสาขาที่ต้องการให้เขียนในใบเสนอราคาและใบกำกับภาษี ที่อยู่ด้านล่างจะตามสาขาที่เลือก
        </p>
      </div>
    ) : (
      <input
        type="hidden"
        name="billingBranch"
        value={selectedLabel || "สำนักงานใหญ่"}
      />
    )}
    </div>
  );
}
