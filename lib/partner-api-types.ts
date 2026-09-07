export const PARTNER_SCOPES = ["quotes:read", "orders:read"] as const;

export type PartnerScope = (typeof PARTNER_SCOPES)[number];

export type PartnerPrincipal = {
  keyId: string;
  name: string;
  source: "env" | "db";
  scopes: PartnerScope[];
};

export type PartnerQuote = {
  requestId: string;
  submittedAt: string;
  leadStatus: string;
  webhookStatus: string;
  webhookDeliveredAt: string | null;
  customerId: number | null;
  name: string;
  company: string;
  email: string;
  phone: string;
  quantity: number;
  budgetPerSet: number | null;
  neededDate: string | null;
  streetAddress: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
  zip: string | null;
  taxId: string | null;
  billingBranch: string | null;
  productInterest: string | null;
  productSlug: string | null;
  decorationMethod: string;
  detail: string | null;
  consentAt: string;
  landingPath: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerQuoteTimelineEntry = {
  createdAt: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
};

export type PartnerPayment = {
  paymentId: string;
  kind: string;
  amount: number;
  method: string;
  status: string;
  customerReference: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerBillingDocument = {
  documentId: string;
  documentType: string;
  status: string;
  subtotalExVat: number;
  vatAmount: number;
  grandTotal: number;
  issuedAt: string;
  voidedAt: string | null;
};

export type PartnerOrderEvent = {
  eventType: string;
  message: string;
  createdAt: string;
};

export type PartnerOrder = {
  orderId: string;
  quoteRequestId: string | null;
  customerId: number | null;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  billingName: string;
  billingTaxId: string | null;
  billingAddress: string | null;
  billingBranch: string;
  shipToName: string | null;
  shipToPhone: string | null;
  shipToAddress: string | null;
  shipToProvince: string | null;
  productSummary: string;
  quantity: number;
  currency: string;
  vatRate: number;
  vatMode: string;
  subtotalExVat: number;
  vatAmount: number;
  totalAmount: number;
  depositMode: string;
  depositPercent: number;
  depositAmount: number;
  remainingAmount: number;
  paidAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type PartnerListResponse<T> = {
  ok: true;
  data: T[];
  nextCursor: string | null;
};
