/** Customer CRM types for local ops console (not NextERP). */

export const CUSTOMER_STATUSES = ["active", "inactive"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export type CustomerRecord = {
  id: number;
  company: string;
  email: string;
  phone: string | null;
  contactName: string | null;
  notes: string | null;
  status: CustomerStatus;
  quoteCount: number;
  lastQuoteAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpsertCustomerFromQuoteParams = {
  company: string;
  email: string;
  phone: string;
  contactName: string;
  quoteSubmittedAt: string;
};

export type UpdateCustomerParams = {
  id: number;
  company?: string;
  phone?: string | null;
  contactName?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
};

export type ListCustomersOptions = {
  q?: string;
  status?: CustomerStatus | "all";
  limit?: number;
  offset?: number;
};
