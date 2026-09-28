# Etoh Cols — ethanol desk (fork of Smart Gift)

Branch `etoh-cols` turns the Smart Gift B2B stack into the operating system for
**บริษัท อิโตะ คอลส์ จำกัด**, an ethanol importer (≈ 8 containers / month, sold
mainly in 200 L drums). Each business runs its own copy of this codebase and its
own database; **NEXTERP consolidates the group** through a signed outbox feed.

```
Smart Gift app ──┐
Etoh Cols app  ──┼──► NEXTERP (group ERP: consolidated sales, stock, customers)
Business #3    ──┘      POST /ingest  (HMAC-signed, idempotent by sourceApp + outboxId)
```

## Phase 1 (this branch)

| Area | Route | Permission | What it does |
| --- | --- | --- | --- |
| Quote calculator | `/ops/etoh` | `quotes.read` (save: `quotes.write`) | Grade × pack lines, tier/volume discount, deposit outside VAT, margin for cost roles |
| Quotes | `/ops/etoh/quotes`, `/[id]` | `quotes.read` | Numbered `EQ-YYMM-0001`, printable, status flow draft → sent → accepted/rejected/expired |
| Customer terms | `/ops/etoh/customers` | `customers.read` / `.write` | Price tier, credit limit/term, reorder cycle, end-use segment (9 segments) |
| Price book | `/ops/etoh/prices` | `catalog.write` | Base price per litre by grade with effective date + history; container, deposit, repack, markup; tier discounts; drums per container |
| Import lots / CoA | `/ops/etoh/lots` | `stock.read` / `.write` | Lot per container, quarantine → released only with CoA; FOOD needs อย. ref; expired lots blocked |
| Returnable drums | `/ops/etoh/drums` | `stock.read` / `.write` | Drums / IBC held by customers and deposit owed; over-returns refused |
| NEXTERP feed | `/ops/etoh/sync` | `reports.read` (push: admin) | Outbox status, manual push |

Code: `lib/etoh/` (catalog, pricing engine, repository, NEXTERP sync),
`app/actions/ops-etoh.ts`, `components/etoh/`, migration `031_etoh_core.sql`.
Tests: `tests/etoh-pricing.test.ts`, `tests/etoh-repository.test.ts`.

## Phase 2 — sales flow and follow-ups

| Step | Where | What happens |
| --- | --- | --- |
| Accept quote → order | `/ops/etoh/quotes/[id]` (`orders.write`) | Creates an `orders` row (ORD-…) from the frozen quote. **Cash** customers get a full-amount invoice + PromptPay voucher and must pay before shipping. **Credit** customers are checked against their credit limit (override needs `catalog.write`, audited). |
| Ship (partial allowed) | `/ops/etoh/orders/[orderId]` (`stock.write`) | Enter the qty per line for this truck (defaults to everything outstanding). Each shipment gets its own DN and **its own ใบกำกับภาษี**; the last shipment reconciles rounding so the invoices sum exactly to the order. Allocates **released, unexpired lots FIFO** (expiry, then arrival), issues the **ใบกำกับภาษี** at delivery, posts revenue + output VAT (AR for credit), opens the payment voucher, records drums/IBC out, marks empty lots `depleted`. A stock shortage aborts with nothing written. |
| Delivery note | `/ops/etoh/orders/[orderId]/dn` | Printable DN-YYMM-NNNN with lot numbers, CoA purity, weights and three signature boxes. |
| Delivered | same page | Receiver name → order `delivered`. |
| Paid later | existing `/ops/orders` / approvals | Confirming the voucher marks the order paid and now issues the **receipt** even when the tax invoice was issued earlier (credit sales). |
| Follow-ups | `/ops/etoh/followups` (`customers.read`) | Customers whose next order is due/late (cycle from terms or average order gap), call log with snooze date, quick link to a pre-filled quote, and credit invoices past due. |

Shared-engine changes: `lib/db-transaction.ts` (nest-safe transactions via
SAVEPOINT) is now used by document numbering and journal posting so the whole
shipment commits atomically; `maybeIssueTaxInvoice` issues the receipt
independently of the tax invoice. Container deposits stay outside the VAT
order total and are handled by the deposit documents below.

## Phase 3 — deposits, partial shipments, LINE, dashboard

Migration `033_etoh_partial_shipments_deposits.sql`.

**Container deposits (ledger account 2150 เงินมัดจำภาชนะรับ)**

| Event | Document | Journal |
| --- | --- | --- |
| Shipment with drums/IBC | `DP-YYMM-NNNN` charge, status *open* | none until collected |
| Deposit collected (`finance.write`, `/ops/etoh/drums`) | DP → *settled*, method + reference | DR cash/bank · CR 2150 |
| Customer returns containers (`stock.write`) | Uncollected open charges are voided/reduced first; only the remainder becomes an `RF-YYMM-NNNN` refund | — |
| Refund paid (`finance.write`) | RF → *settled* | DR 2150 · CR cash/bank |

Printable receipt/refund slip: `/ops/etoh/deposits/[id]` (not a tax invoice — deposits are outside the VAT base). Opening balances of drums already at customers: "ยอดยกมา" on the drums page.

**LINE alerts** (Messaging API push, never blocks the business action)

- New web RFQ → pushed immediately to `ETOH_SALES_LINE_TO`.
- Daily digest: `POST /api/jobs/etoh-daily-digest` with `Authorization: Bearer $CRON_SECRET` (suggested 08:15 Asia/Bangkok) — month-to-date litres vs target, open quotes, customers due to reorder, overdue invoices.

**Dashboard** `/ops/etoh/dashboard` (`reports.read`): delivered litres/containers vs target (default 12 ISO tanks × 25,000 L; tank size and target editable), pace line and month-end projection, 6-month history, RFQs, open quotes, 90-day win rate, receivables, reorder calls due, stock cover by grade, top customers.

### Real operating model (Sep 2026)

- Imports are ISO tanks only: Myanmar 6 × 20,000 kg and Pakistan 2 × 19,500 kg per month; trade factor 1 kg = 1.25 L (0.80 kg/L).
- Grades sold: industrial 96% (`IND95`), 99% (`IND999`) and 75% (`IND75`). Codes are historical database keys.
- Prices can be entered in THB/kg on `/ops/etoh/prices`; the price book stores THB/L (THB/kg × 0.8) and shows both.
- Container planning / dashboard use `litres_per_container` (default 25,000 L).

### Pricing rules

- Price of one pack = base ฿/L × litres × (1 − tier %) × (1 + small-pack markup, jerrycans only) + container + repack (jerrycans only).
- Effective tier = the better of the customer's CRM tier and the volume tier (≥ 1,000 L volume, ≥ 4,000 L contract, ≥ 25,000 L bulk).
- Contract / dealer / bulk tiers can be assigned only by roles with `catalog.write`.
- Drum / IBC deposits are refundable and kept out of the VAT base. Delivery is VAT-able.
- Money is computed in satang; unit price × qty always equals the printed line total.
- Saved quotes are recomputed on the server from the live price book; the CRM tier overrides whatever the browser sent.
- Landed cost is visible only to `factory.read` roles and never leaves the app (not in the NEXTERP feed).

## NEXTERP contract

`POST $NEXTERP_SYNC_URL` with headers `X-Source-App: etoh-cols`, `X-Timestamp`,
`X-Signature: sha256=<HMAC-SHA256(body, NEXTERP_SYNC_SECRET)>`.

```json
{
  "sourceApp": "etoh-cols",
  "sentAt": "2026-09-26T09:00:00.000Z",
  "timestamp": 1790413200,
  "events": [
    { "outboxId": 12, "entity": "quote", "entityId": "EQ-6909-0001", "event": "quote.created",
      "createdAt": "…", "data": { "sourceApp": "etoh-cols", "data": { "grandTotalThb": 68990, "lines": [ … ] } } }
  ]
}
```

Reply `200 {"accepted":[12, …]}`. Unaccepted events retry; after 10 failures they
park as `failed`. Events: `price.published`, `quote.created|sent|accepted|rejected|expired`,
`customer_terms.updated`, `lot.received`, `lot.status_changed`, `container.moved`.

Schedule: `POST /api/jobs/etoh-nexterp-sync` with `Authorization: Bearer $CRON_SECRET` every 5 minutes.

## Go-live checklist

- [ ] Fill `SITE_TAX_ID` and registered address in the deployment env (see `.env.etoh.example`); build refuses indexing until set.
- [ ] Separate `SQLITE_PATH` (never share Smart Gift's database).
- [ ] Enter base prices, container deposits and tier discounts on `/ops/etoh/prices`.
- [ ] NEXTERP: implement the ingest endpoint above, then set `NEXTERP_SYNC_URL` / `NEXTERP_SYNC_SECRET`.
- [ ] LINE OA: create a Messaging API channel, add the OA to the sales group, set `LINE_CHANNEL_ACCESS_TOKEN`, `ETOH_SALES_LINE_TO` (groupId `C…`), `ETOH_OPS_BASE_URL`; schedule the digest cron.
- [ ] Record opening drum balances per customer on `/ops/etoh/drums` before the first live shipment.
- [ ] Confirm excise-department licensing for repacking into 20 L / 5 L before enabling those packs.

## Not yet converted (next phases)

- AI assistant prompts may still reference gift sets — review before enabling the chat widget.
- Privacy / terms pages still carry Smart Gift wording — needs legal review for Etoh Cols.
- WMS bin-level stock for drums, dealer portal, import forecast.
