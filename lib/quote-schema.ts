import { z } from "zod";
import { cleanText } from "@/lib/sanitize";
import {
  DECORATION_METHODS,
  type QuoteRequestInput,
} from "@/lib/quote-types";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function cleanedString(max: number, min = 0) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null) return value;
      return cleanText(String(value));
    },
    min > 0
      ? z.string().min(min).max(max)
      : z.string().max(max),
  );
}

function optionalCleanedString(max: number) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      const cleaned = cleanText(String(value));
      return cleaned.length === 0 ? undefined : cleaned;
    },
    z.string().max(max).optional(),
  );
}

function bangkokTodayYmd(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isRealCalendarDate(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export const quoteSchema = z
  .object({
    name: cleanedString(100, 2),
    company: cleanedString(160, 2),
    email: z.preprocess(
      (value) => cleanText(String(value ?? "")),
      z.string().email().max(254),
    ),
    phone: z.preprocess(
      (value) => cleanText(String(value ?? "")),
      z
        .string()
        .min(8)
        .max(20)
        .regex(PHONE_PATTERN, "Invalid phone format"),
    ),
    quantity: z.coerce.number().int().min(1).max(1_000_000),
    consent: z.preprocess((value) => {
      if (value === true || value === "true" || value === "on" || value === "1") {
        return true;
      }
      return false;
    }, z.literal(true, { errorMap: () => ({ message: "Consent is required" }) })),
    budgetPerSet: z.preprocess((value) => {
      if (value === undefined || value === null || value === "") return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }, z.number().positive().max(10_000_000).optional()),
    neededDate: z.preprocess((value) => {
      if (value === undefined || value === null || value === "") return undefined;
      return cleanText(String(value));
    }, z.string().regex(DATE_PATTERN).optional()),
    province: optionalCleanedString(100),
    productInterest: optionalCleanedString(200),
    productSlug: z.preprocess((value) => {
      if (value === undefined || value === null) return undefined;
      const cleaned = cleanText(String(value));
      return cleaned.length === 0 ? undefined : cleaned;
    }, z
      .string()
      .max(160)
      .refine((v) => SLUG_PATTERN.test(v), "Invalid product slug")
      .optional()),
    decorationMethod: z.preprocess(
      (value) => {
        const cleaned = cleanText(String(value ?? "not-sure"));
        return cleaned || "not-sure";
      },
      z.enum(DECORATION_METHODS),
    ),
    detail: optionalCleanedString(2000),
    landingPath: optionalCleanedString(500),
    referrer: optionalCleanedString(1000),
    utmSource: optionalCleanedString(200),
    utmMedium: optionalCleanedString(200),
    utmCampaign: optionalCleanedString(300),
    utmTerm: optionalCleanedString(300),
    utmContent: optionalCleanedString(300),
    website: z.preprocess((value) => {
      if (value === undefined || value === null) return "";
      return String(value);
    }, z.string().max(500).optional()),
    startedAt: z.preprocess((value) => {
      if (value === undefined || value === null || value === "") return undefined;
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }, z.number().int().positive().optional()),
  })
  .superRefine((data, ctx) => {
    if (!data.neededDate) return;
    if (!isRealCalendarDate(data.neededDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["neededDate"],
        message: "Invalid calendar date",
      });
      return;
    }
    const today = bangkokTodayYmd();
    if (data.neededDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["neededDate"],
        message: "Date must not be in the past (Asia/Bangkok)",
      });
    }
  });

export type QuoteSchemaOutput = z.infer<typeof quoteSchema>;

export function parseQuoteFormData(
  formData: FormData,
): {
  success: true;
  data: QuoteRequestInput;
} | {
  success: false;
  fieldErrors: Record<string, string>;
} {
  const raw: Record<string, FormDataEntryValue | undefined> = {
    name: formData.get("name") ?? undefined,
    company: formData.get("company") ?? undefined,
    email: formData.get("email") ?? undefined,
    phone: formData.get("phone") ?? undefined,
    quantity: formData.get("quantity") ?? undefined,
    consent: formData.get("consent") ?? undefined,
    budgetPerSet: formData.get("budgetPerSet") ?? undefined,
    neededDate: formData.get("neededDate") ?? undefined,
    province: formData.get("province") ?? undefined,
    productInterest: formData.get("productInterest") ?? undefined,
    productSlug: formData.get("productSlug") ?? undefined,
    decorationMethod: formData.get("decorationMethod") ?? undefined,
    detail: formData.get("detail") ?? undefined,
    landingPath: formData.get("landingPath") ?? undefined,
    referrer: formData.get("referrer") ?? undefined,
    utmSource: formData.get("utmSource") ?? undefined,
    utmMedium: formData.get("utmMedium") ?? undefined,
    utmCampaign: formData.get("utmCampaign") ?? undefined,
    utmTerm: formData.get("utmTerm") ?? undefined,
    utmContent: formData.get("utmContent") ?? undefined,
    website: formData.get("website") ?? undefined,
    startedAt: formData.get("startedAt") ?? undefined,
  };

  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: parsed.data as QuoteRequestInput,
  };
}

export { bangkokTodayYmd };
