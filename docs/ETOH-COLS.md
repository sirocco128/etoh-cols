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
- [ ] Confirm excise-department licensing for repacking into 20 L / 5 L before enabling those packs.

## Not yet converted (next phases)

- Public storefront, blog, AI assistant copy and SEO still carry Smart Gift gift-set content (≈ 20 files under `app/`, `lib/data.ts`, `lib/ux-copy.ts`, assistant prompts). Phase 2 replaces them with ethanol product / end-use pages and an RFQ form.
- Quote → order → tax invoice hand-off into the existing order/billing cycle, and lot allocation on shipment (WMS product keys `ETH-<GRADE>-<PACK>`).
- Reorder reminders from `reorder_cycle_days`, dealer portal, import forecast.
