/**
 * Read helpers shared by the /ops/etoh pages (server-only).
 */

import { listCustomers } from "@/lib/customer-repository";
import { getCustomerTerms } from "@/lib/etoh/repository";
import type { EtohTierCode } from "@/lib/etoh/catalog";

export type EtohCustomerOption = {
  id: number;
  name: string;
  taxId: string | null;
  contact: string | null;
  tier: EtohTierCode;
  creditTermDays: number;
  creditLimitThb: number;
  reorderCycleDays: number | null;
  endUseSegment: string | null;
};

export function listEtohCustomerOptions(q = "", limit = 500): EtohCustomerOption[] {
  return listCustomers({ q: q || undefined, status: "active", limit }).map((c) => {
    const terms = getCustomerTerms(c.id);
    const contactBits = [c.contactName, c.phone].filter(Boolean).join(" · ");
    return {
      id: c.id,
      name: c.billingName || c.company,
      taxId: c.taxId,
      contact: contactBits || null,
      tier: terms.priceTier,
      creditTermDays: terms.creditTermDays,
      creditLimitThb: terms.creditLimitThb,
      reorderCycleDays: terms.reorderCycleDays,
      endUseSegment: terms.endUseSegment,
    };
  });
}

export function formatThb(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Bangkok" });
}
