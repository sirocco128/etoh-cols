# Ops Console — ลูกค้า + ใบเสนอราคา

Local staff UI for RFQ leads and a lightweight CRM. **Not** Strapi CMS and **not** NextERP.

## URL

- Login: http://localhost:3000/ops/login
- Quotes: http://localhost:3000/ops/quotes
- Customers: http://localhost:3000/ops/customers
- Factory photos: http://localhost:3000/ops/catalog-images — Gemini searches live 1688 / Alibaba listings and stores images in SQLite (not the public catalog)

## Env

```bash
ADMIN_PASSWORD=at-least-12-chars
ADMIN_SESSION_SECRET=at-least-32-random-characters
```

Restart Next after changing env. Cookie session lasts 12 hours (`ops_session`).

## Behaviour

1. Public RFQ at `/contact` still persists to SQLite (`quote_requests`).
2. On submit, ops **upserts a customer** by email and links `customer_id`.
3. Staff can change lead status: ใหม่ → ติดต่อแล้ว → ส่งใบเสนอราคาแล้ว → ปิดการขาย / ไม่สำเร็จ / เก็บถาวร.
4. Sales notes stay internal on the quote row.

## Stock photos (try-fill)

```bash
npm run images:stock
```

Downloads Unsplash JPGs into `public/images/` (see `STOCK-CREDITS.md`).  
Keep `REAL_ASSETS_APPROVED=false` until licensed brand assets replace them.

Re-seed Strapi media after download:

```bash
npm run cms:seed
```

## Migrate

```bash
npm run db:migrate
```

Applies `002_customers_and_lead_workflow.sql` (customers table + `sales_notes` / `customer_id`).

## Limits

- Single-password auth (no SSO / roles)
- SQLite single-instance only
- No quote PDF, pricing engine, or ERP sync yet
