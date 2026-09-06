"use client";

import { CompanyLookupField } from "@/components/CompanyLookupField";
import { ContactFields } from "@/components/ContactFields";
import { ThaiAddressFields } from "@/components/ThaiAddressFields";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  submitQuote,
  type QuoteActionState,
  type QuoteFormValues,
} from "@/app/actions/quote";
import {
  appendQuoteDetailTemplate,
  QUOTE_DETAIL_HINT,
  QUOTE_DETAIL_TEMPLATES,
  RFQ_NO_PAYMENT,
} from "@/lib/ux-copy";
import { emailFieldError, phoneFieldError } from "@/lib/contact-validate";
import { getPublicContact } from "@/lib/public-contact";
import { site } from "@/lib/site";
import {
  clearBasketStorage,
  loadBasketFromStorage,
} from "@/lib/quote-basket";
import { isP2QuoteToolsEnabled } from "@/lib/feature-flags";
import {
  MOCKUP_BRIEF_EVENT,
  type MockupBriefEventDetail,
} from "@/lib/mockup-studio";

const DRAFT_KEY = "giftpro:quote-form-draft:v1";

const initialState: QuoteActionState = { ok: false };

const DECORATION_OPTIONS = [
  { value: "not-sure", label: "ยังไม่แน่ใจ" },
  { value: "screen-print", label: "สกรีนพิมพ์" },
  { value: "uv-print", label: "พิมพ์ UV" },
  { value: "laser", label: "เลเซอร์" },
  { value: "embroidery", label: "ปัก" },
] as const;

type QuoteFormProps = {
  productInterest?: string;
  productSlug?: string;
  heading?: string;
  /** Prefill from URL / basket (server-passed) */
  initialDetail?: string;
  initialQuantity?: string;
  basketId?: string;
  minOrder?: number;
};

const QUOTE_STEPS = ["ผู้ติดต่อ", "งานที่ต้องการ", "ที่อยู่และส่งคำขอ"] as const;

function fieldError(
  fieldErrors: Record<string, string> | undefined,
  name: string,
): string | undefined {
  return fieldErrors?.[name];
}

function readQueryPrefill(): Partial<QuoteFormValues> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const prefill: Partial<QuoteFormValues> = {};
  const note = params.get("note");
  const product = params.get("product") || params.get("productInterest");
  const slug = params.get("slug") || params.get("productSlug");
  const quantity = params.get("quantity");
  const decoration = params.get("decorationMethod");
  if (note) prefill.detail = note;
  if (product) prefill.productInterest = product;
  if (slug) prefill.productSlug = slug;
  if (quantity) prefill.quantity = quantity;
  if (decoration) prefill.decorationMethod = decoration;
  const neededDate = params.get("neededDate");
  if (neededDate) prefill.neededDate = neededDate;
  return prefill;
}

function loadDraft(): QuoteFormValues {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as QuoteFormValues;
  } catch {
    return {};
  }
}

function saveDraft(values: QuoteFormValues) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function QuoteForm({
  productInterest = "",
  productSlug = "",
  heading = "ขอใบเสนอราคา",
  initialDetail = "",
  initialQuantity = "",
  basketId = "",
  minOrder = 1,
}: QuoteFormProps) {
  const [state, formAction, pending] = useActionState(submitQuote, initialState);
  const contact = getPublicContact(site);
  const [startedAt, setStartedAt] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draft, setDraft] = useState<QuoteFormValues>({});
  const [contactAttempted, setContactAttempted] = useState(false);
  const [step, setStep] = useState(0);
  const startedRef = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const stepperRef = useRef<HTMLOListElement>(null);
  const stepMounted = useRef(false);

  useEffect(() => {
    if (!stepMounted.current) {
      stepMounted.current = true;
      return;
    }
    stepperRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step]);

  const attribution = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        landingPath: "",
        referrer: "",
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmTerm: "",
        utmContent: "",
      };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      landingPath: `${window.location.pathname}${window.location.search}`,
      referrer: document.referrer || "",
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmTerm: params.get("utm_term") || "",
      utmContent: params.get("utm_content") || "",
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setStartedAt(String(Date.now()));

    const query = readQueryPrefill();
    const stored = loadDraft();
    const seed: QuoteFormValues = {
      ...stored,
      ...query,
      productInterest:
        productInterest || query.productInterest || stored.productInterest || "",
      productSlug: productSlug || query.productSlug || stored.productSlug || "",
      detail: initialDetail || query.detail || stored.detail || "",
      quantity: initialQuantity || query.quantity || stored.quantity || "",
    };
    if (basketId) {
      seed.detail = seed.detail
        ? `${seed.detail}\n\n(รหัสตะกร้า: ${basketId})`
        : `อ้างอิงตะกร้าใบเสนอราคา: ${basketId}`;
    }
    setDraft(seed);
    setDraftReady(true);
  }, [productInterest, productSlug, initialDetail, initialQuantity, basketId]);

  useEffect(() => {
    if (!state.values) return;
    setDraft((prev) => {
      const next = { ...prev, ...state.values };
      saveDraft(next);
      return next;
    });
  }, [state.values]);

  useEffect(() => {
    function onMockupBrief(event: Event) {
      const detail = (event as CustomEvent<MockupBriefEventDetail>).detail;
      const incoming = detail?.text?.trim();
      if (!incoming) return;
      setDraft((prev) => {
        const previous = prev.detail?.trim() ?? "";
        const stripped = previous
          .replace(
            /ตัวอย่างการวางโลโก้บนหน้าเว็บ[\s\S]*?(?:กรุณาส่งไฟล์โลโก้จริงให้ทีมขายทางอีเมลหรือ LINE)?/u,
            "",
          )
          .trim();
        const nextDetail = stripped ? `${stripped}\n\n${incoming}` : incoming;
        const next = { ...prev, detail: nextDetail };
        saveDraft(next);
        return next;
      });
    }
    window.addEventListener(MOCKUP_BRIEF_EVENT, onMockupBrief);
    return () => window.removeEventListener(MOCKUP_BRIEF_EVENT, onMockupBrief);
  }, []);

  useEffect(() => {
    if (!state.fieldErrors) return;
    const keys = Object.keys(state.fieldErrors);
    if (keys.some((key) => ["name", "company", "email", "phone", "taxId", "billingBranch"].includes(key))) {
      setStep(0);
    } else if (
      keys.some((key) =>
        ["quantity", "budgetPerSet", "neededDate", "productInterest", "decorationMethod", "detail"].includes(key),
      )
    ) {
      setStep(1);
    } else {
      setStep(2);
    }
  }, [state.fieldErrors]);

  useEffect(() => {
    if (state.ok && state.requestId) {
      clearDraft();
      if (isP2QuoteToolsEnabled()) {
        try {
          const basket = loadBasketFromStorage();
          if (basket.items.length > 0) clearBasketStorage();
        } catch {
          // ignore
        }
      }
      successRef.current?.focus();
    }
  }, [state.ok, state.requestId]);

  function onFormInput(event: FormEvent<HTMLFormElement>) {
    const native = event.nativeEvent as InputEvent;
    if (native.isComposing) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const next: QuoteFormValues = {};
    for (const [key, value] of data.entries()) {
      if (typeof value === "string" && key !== "website" && key !== "startedAt") {
        next[key] = value;
      }
    }
    setDraft(next);
    saveDraft(next);
  }

  function patchDraft(partial: QuoteFormValues) {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      saveDraft(next);
      return next;
    });
  }

  function applyDetailTemplate(body: string) {
    setDraft((prev) => {
      const nextDetail = appendQuoteDetailTemplate(prev.detail || "", body);
      const next = { ...prev, detail: nextDetail };
      saveDraft(next);
      return next;
    });
  }

  const values = { ...draft, ...(state.values || {}) };
  const val = (name: string, fallback = "") => values[name] ?? fallback;
  const detailValue = val("detail");

  if (state.ok && state.requestId) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-forest/15 bg-forest-mist p-6 text-forest outline-none sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-brass">
          ส่งคำขอสำเร็จ
        </p>
        <h3 className="mt-2 text-2xl font-bold">รับคำขอเรียบร้อยแล้ว</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink/80">
          ทีมขายจะติดต่อกลับภายในเวลาทำการ กรุณาเก็บหมายเลขอ้างอิงไว้เพื่อติดตามผล
        </p>
        <p className="mt-5 rounded-xl bg-paper px-4 py-3 font-mono text-lg font-semibold tracking-wide text-forest">
          {state.requestId}
        </p>
        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-ink/80">
          <li>ตรวจสอบอีเมล/โทรศัพท์ที่ให้ไว้ให้พร้อมรับสาย</li>
          <li>เตรียมโลโก้ (AI/PDF/PNG) และจำนวนโดยประมาณ</li>
          {contact.showPhone || contact.showLine ? (
            <li>หากเร่งด่วน ติดต่อผ่านโทรศัพท์หรือ LINE ได้เลย</li>
          ) : (
            <li>หากเร่งด่วน ส่งรายละเอียดเพิ่มในอีเมลตอบกลับจากทีมขาย</li>
          )}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          {contact.showPhone ? (
            <a
              href={site.phoneHref}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-paper"
            >
              โทร {site.phoneDisplay}
            </a>
          ) : null}
          {contact.showLine ? (
            <a
              href={site.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-5 text-sm font-semibold text-forest"
            >
              แชทไลน์ {site.lineId}
            </a>
          ) : null}
          <Link
            href="/products"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-5 text-sm font-semibold text-forest"
          >
            เลือกสินค้าเพิ่ม
          </Link>
        </div>
        <p className="mt-6 text-xs text-ink/60">{RFQ_NO_PAYMENT}</p>
      </div>
    );
  }

  if (!draftReady) {
    return (
      <div
        className="rounded-2xl border border-forest/10 bg-paper p-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-ink/60">กำลังเตรียมฟอร์ม…</p>
      </div>
    );
  }

  function goNext() {
    if (step === 0) {
      const emailIssue = emailFieldError(val("email"));
      const phoneIssue = phoneFieldError(val("phone"));
      if (!val("name")?.trim() || !val("company")?.trim() || emailIssue || phoneIssue) {
        setContactAttempted(true);
        return;
      }
    }
    if (step === 1 && !(val("quantity") || "").trim()) return;
    setStep((current) => Math.min(QUOTE_STEPS.length - 1, current + 1));
  }

  const errors = state.fieldErrors;
  const errorSummaryId = "quote-error-summary";

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={onFormInput}
      onSubmit={(event) => {
        const emailIssue = emailFieldError(val("email"));
        const phoneIssue = phoneFieldError(val("phone"));
        if (emailIssue || phoneIssue) {
          event.preventDefault();
          setContactAttempted(true);
        }
      }}
      className="relative space-y-5 rounded-2xl border border-white/20 bg-paper/90 p-4 shadow-glass backdrop-blur-md sm:p-8 dark:border-white/10"
      noValidate
    >
      <div>
        <h2 className="text-2xl font-bold text-forest">{heading}</h2>
        <p className="mt-2 text-sm text-ink/70">{RFQ_NO_PAYMENT}</p>
        <p className="mt-1 text-xs text-ink/55">
          หากส่งไม่สำเร็จ ระบบเก็บบร่างไว้ในเครื่องนี้ให้กดส่งซ้ำได้
        </p>
      </div>

      <ol
        ref={stepperRef}
        className="flex flex-wrap gap-2 text-xs"
        aria-label="ขั้นตอนแบบฟอร์ม"
      >
        {QUOTE_STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={`rounded-full px-3 py-1 ${
              index === step
                ? "bg-forest text-paper"
                : index < step
                  ? "bg-forest-mist text-forest"
                  : "bg-forest-mist/50 text-ink/50"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {state.formError ? (
        <div
          id={errorSummaryId}
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p>{state.formError}</p>
          <p className="mt-2 text-xs text-red-700/80">
            ข้อมูลที่กรอกยังอยู่ครบ กดส่งอีกครั้งได้เลย หรือ{" "}
            <a href={site.phoneHref} className="underline">
              โทรฝ่ายขาย
            </a>
          </p>
        </div>
      ) : null}

      <div
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="website" aria-hidden="true">
          เว็บไซต์
        </label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </div>

      <input type="hidden" name="startedAt" value={startedAt} />
      <input type="hidden" name="landingPath" value={attribution.landingPath} />
      <input type="hidden" name="referrer" value={attribution.referrer} />
      <input type="hidden" name="utmSource" value={attribution.utmSource} />
      <input type="hidden" name="utmMedium" value={attribution.utmMedium} />
      <input type="hidden" name="utmCampaign" value={attribution.utmCampaign} />
      <input type="hidden" name="utmTerm" value={attribution.utmTerm} />
      <input type="hidden" name="utmContent" value={attribution.utmContent} />
      <input
        type="hidden"
        name="productSlug"
        value={val("productSlug", productSlug)}
      />

      <div className={step === 0 ? "space-y-5" : "hidden"}>
      <Field
        id="name"
        name="name"
        label="ชื่อ-นามสกุล *"
        error={fieldError(errors, "name")}
        autoComplete="name"
        defaultValue={val("name")}
      />

      <CompanyLookupField
        taxId={val("taxId")}
        company={val("company")}
        billingBranch={val("billingBranch")}
        taxError={fieldError(errors, "taxId")}
        companyError={fieldError(errors, "company")}
        onTaxIdChange={(value) =>
          patchDraft({
            taxId: value,
            ...(value.replace(/\D/g, "").length !== 13 ? { billingBranch: "" } : {}),
          })
        }
        onCompanyChange={(value) => patchDraft({ company: value })}
        onFill={(fill) =>
          patchDraft({
            taxId: fill.taxId,
            company: fill.company,
            ...(fill.billingBranch ? { billingBranch: fill.billingBranch } : {}),
            ...(fill.streetAddress ? { streetAddress: fill.streetAddress } : {}),
            ...(fill.province ? { province: fill.province } : {}),
            ...(fill.district ? { district: fill.district } : {}),
            ...(fill.subdistrict ? { subdistrict: fill.subdistrict } : {}),
            ...(fill.zip ? { zip: fill.zip } : {}),
          })
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ContactFields
          email={val("email")}
          phone={val("phone")}
          emailError={fieldError(errors, "email")}
          phoneError={fieldError(errors, "phone")}
          forceShow={contactAttempted}
          onChange={(next) => patchDraft(next)}
        />
      </div>
      </div>

      <div className={step === 1 ? "space-y-5" : "hidden"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="quantity"
          name="quantity"
          type="number"
          label="จำนวนโดยประมาณ (เซ็ต) *"
          error={fieldError(errors, "quantity")}
          min={Math.max(1, minOrder)}
          defaultValue={val("quantity") || (minOrder > 1 ? String(minOrder) : "")}
        />
        <Field
          id="budgetPerSet"
          name="budgetPerSet"
          type="number"
          label="งบประมาณต่อเซ็ต (บาท)"
          error={fieldError(errors, "budgetPerSet")}
          min={0}
          defaultValue={val("budgetPerSet")}
        />
        <Field
          id="neededDate"
          name="neededDate"
          type="date"
          label="วันที่ต้องการใช้งาน"
          error={fieldError(errors, "neededDate")}
          defaultValue={val("neededDate")}
        />
      </div>

      <Field
        id="productInterest"
        name="productInterest"
        label="สินค้า / เซ็ตที่สนใจ"
        defaultValue={val("productInterest", productInterest)}
        error={fieldError(errors, "productInterest")}
      />

      <div>
        <label
          htmlFor="decorationMethod"
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          วิธีตกแต่งโลโก้
        </label>
        <select
          id="decorationMethod"
          name="decorationMethod"
          defaultValue={val("decorationMethod", "not-sure")}
          className="min-h-11 w-full rounded-xl border border-forest/20 bg-paper px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          aria-invalid={Boolean(fieldError(errors, "decorationMethod"))}
          aria-describedby={
            fieldError(errors, "decorationMethod")
              ? "decorationMethod-error"
              : undefined
          }
        >
          {DECORATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldError(errors, "decorationMethod") ? (
          <p id="decorationMethod-error" className="mt-1 text-sm text-red-700">
            {fieldError(errors, "decorationMethod")}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="detail" className="mb-1.5 block text-sm font-medium text-ink">
          รายละเอียดเพิ่มเติม
        </label>
        <p id="detail-hint" className="mb-2 text-xs text-ink/60">
          {QUOTE_DETAIL_HINT}
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {QUOTE_DETAIL_TEMPLATES.map((template) => {
            const selected = detailValue.includes(template.body);
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => applyDetailTemplate(template.body)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-left text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
                  selected
                    ? "border-forest bg-forest text-paper"
                    : "border-forest/20 bg-forest-mist/60 text-forest hover:border-brass hover:bg-brass/15"
                }`}
              >
                {template.label}
              </button>
            );
          })}
        </div>
        <textarea
          id="detail"
          name="detail"
          rows={6}
          value={detailValue}
          onChange={(event) => {
            const nextDetail = event.target.value;
            setDraft((prev) => {
              const next = { ...prev, detail: nextDetail };
              saveDraft(next);
              return next;
            });
          }}
          placeholder="เช่น จำนวน วันที่ใช้ วิธีใส่โลโก้ จุดส่ง หรือเลือกข้อความด้านบนแล้วแก้ต่อ"
          className="w-full rounded-xl border border-forest/20 bg-paper px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          aria-invalid={Boolean(fieldError(errors, "detail"))}
          aria-describedby={
            fieldError(errors, "detail") ? "detail-hint detail-error" : "detail-hint"
          }
        />
        {fieldError(errors, "detail") ? (
          <p id="detail-error" className="mt-1 text-sm text-red-700">
            {fieldError(errors, "detail")}
          </p>
        ) : null}
      </div>
      </div>

      <div className={step === 2 ? "space-y-5" : "hidden"}>
      <ThaiAddressFields
        streetAddress={val("streetAddress")}
        province={val("province")}
        district={val("district")}
        subdistrict={val("subdistrict")}
        zip={val("zip")}
        streetError={fieldError(errors, "streetAddress")}
        provinceError={fieldError(errors, "province")}
        onChange={(next) => patchDraft(next)}
      />

      <div className="flex items-start gap-3">
        <input
          id="consent"
          name="consent"
          type="checkbox"
          value="true"
          required={step === 2}
          defaultChecked={val("consent") === "true"}
          className="mt-1 h-5 w-5 rounded border-forest/30 text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          aria-invalid={Boolean(fieldError(errors, "consent"))}
          aria-describedby={fieldError(errors, "consent") ? "consent-error" : undefined}
        />
        <label htmlFor="consent" className="text-sm text-ink/85">
          ยินยอมให้ติดต่อกลับเพื่อเสนอราคา และรับทราบนโยบายความเป็นส่วนตัว *
        </label>
      </div>
      {fieldError(errors, "consent") ? (
        <p id="consent-error" className="text-sm text-red-700">
          {fieldError(errors, "consent")}
        </p>
      ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/20 px-6 text-sm font-semibold text-forest"
          >
            ย้อนกลับ
          </button>
        ) : null}
        {step < QUOTE_STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-6 text-sm font-semibold text-paper"
          >
            ถัดไป
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending || !startedAt}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-forest px-6 text-sm font-semibold text-paper transition hover:bg-forest-light disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass sm:w-auto"
          >
            {pending ? "กำลังส่ง..." : "ส่งคำขอใบเสนอราคา"}
          </button>
        )}
      </div>
    </form>
  );
}

type FieldProps = {
  id: string;
  name: string;
  label: string;
  error?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  min?: number;
};

function Field({
  id,
  name,
  label,
  error,
  type = "text",
  required,
  autoComplete,
  defaultValue,
  min,
}: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        min={min}
        className="min-h-11 w-full rounded-xl border border-forest/20 bg-paper px-3 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
