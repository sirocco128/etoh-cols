# Ops Console — ลูกค้า + ใบเสนอราคา

Local staff UI for RFQ leads and a lightweight CRM. **Not** Strapi CMS and **not** NextERP.

## URL

- Login: http://localhost:3000/ops/login
- Quotes: http://localhost:3000/ops/quotes
- Orders / payments: http://localhost:3000/ops/orders
- Factory PO (admin): http://localhost:3000/ops/factory-po
- Ops cycle (receipts / inbound / pay factory / assets / claims / issues / QR / **approvals**): http://localhost:3000/ops/cycle
- Accounting slip approval: http://localhost:3000/ops/approvals
- Executive P&L (admin): http://localhost:3000/ops/finance
- Customers: http://localhost:3000/ops/customers
- New customer: http://localhost:3000/ops/customers/new
- LINE lab: http://localhost:3000/ops/line-lab (sales / admin)
- Sales assistant: http://localhost:3000/ops/assistant (admin / sales)
- Factory photos: http://localhost:3000/ops/catalog-images (admin / sales) — Gemini searches live 1688 / Alibaba listings and stores images in SQLite (not the public catalog)
- **Strapi CMS:** from ภาพรวม or เมนู เพิ่มเติม → **เข้า Strapi** (admin / sales) — opens `{STRAPI_ADMIN_URL}` or `{STRAPI_URL}/admin` in a new tab. If `STRAPI_URL` is `host.docker.internal`, the link rewrites to `localhost` so it works in the browser.
- Audit: http://localhost:3000/ops/audit (admin)
- Users / RBAC: http://localhost:3000/ops/users (admin)

## Env

```bash
ADMIN_PASSWORD=at-least-12-chars
ADMIN_SESSION_SECRET=at-least-32-random-characters
ADMIN_EMAIL=admin
# Optional extra users:
# OPS_USERS=[{"email":"sales@local","password":"sales-pass-12x","role":"sales","name":"เซลล์"},{"email":"view@local","password":"viewer-pass-12","role":"viewer","name":"ดูอย่างเดียว"}]
```

Restart Next after changing env. Cookie session lasts 12 hours (`ops_session`).

Roles:

| บทบาท | สิทธิ์ |
|---|---|
| ผู้ดูแล (`admin`) | ทั้งหมด รวมใบสั่งโรงงาน จีน, งบผู้บริหาร, บันทึกการใช้งาน, **จัดการผู้ใช้/สิทธิ์** |
| เซลล์ (`sales`) | ใบเสนอราคา + ออเดอร์/รับชำระ + ลูกค้า + ผู้ช่วยเซลล์ (ไม่เห็นต้นทุนโรงงาน/กำไรขั้นต้น) |
| ดูอย่างเดียว (`viewer`) | อ่านอย่างเดียว |

## Behaviour

1. Public RFQ at `/contact` still persists to SQLite (`quote_requests`).
2. On submit, ops **upserts a customer** by email (and a primary contact) and links `customer_id`.
3. Staff can change lead status: ใหม่ → ติดต่อแล้ว → ส่งใบเสนอราคาแล้ว → ปิดการขาย / ไม่สำเร็จ / เก็บถาวร.
4. From a quoted/won lead, staff opens an **order**: VAT 7% (exclusive by default), auto deposit (full if ≤ 10,000 THB incl. VAT, else 50%), PromptPay QR, then remaining when goods reach the warehouse. Tax invoice is issued when paid in full and goods are in warehouse / out for delivery / delivered (revenue recognition on delivery, Thai SME practice). Billing address comes from the **customer tax card**, not the quote ship-to province.
5. Customer card stores LINE, tax-invoice defaults, type/source/tags, and multiple contacts. **ประวัติการขาย** on `/ops/customers/[id]` shows product types the customer already ordered (กระบอกน้ำ / รักษ์โลก / ไอที ฯลฯ) plus each order’s item, qty, and amount. Admin can merge duplicates and import FlowAccount CSV.
6. LINE OA: ทดลองที่ `/ops/line-lab` ด้วย `LINE_OA_TEST_MODE=true` (ยิง `/api/line/webhook` รวมลายเซ็น HMAC โดยไม่ต้องมี Channel). ของจริงตั้ง `LINE_OA_ENABLED=true` กับ secret/token แล้วให้ลูกค้าส่งรหัส `TB-…`
6. Login, status changes, and assistant calls are written to `ops_audit_log` (secrets redacted).
7. ผู้ช่วยเซลล์ สรุปคำขอ / ร่างข้อความ LINE / ค้นแคตตาล็อก — ไม่ออกใบเสนอราคาและไม่เปิดต้นทุนโรงงาน.
8. **ใบสั่งโรงงานจีน** (admin): สเปคโลโก้ + ต้นทุนโรงงาน/ขนส่ง/นำเข้า/จัดส่งลูกค้า ต่อ PO จากหน้ารายละเอียดออเดอร์. เมื่อสถานะโรงงานยืนยันแล้ว ระบบลงบัญชีต้นทุน. เลือกปลายทาง **เข้าคลังไทย** หรือ **ไม่เข้าคลัง — ส่งตรงลูกค้า**.
9. **งบผู้บริหาร** (admin): กำไรขั้นต้น ค่าใช้จ่ายขาย งบทดลอง สมุดรายวัน และส่งออก CSV ให้โปรแกรมบัญชี.
10. **วงจรปฏิบัติการ** (`/ops/cycle`): ใบรับเงินตามรายการรับ + QR พร้อมเพย์ (แสดงประเภท/หมายเลขพร้อมเพย์และชื่อบัญชี), รับสินค้าตาม PO, จ่ายโรงงานได้ไม่เกินยอดของที่รับ, ทะเบียนทรัพย์, เคลม, รับแจ้งปัญหา. หลังโอน ลูกค้าแจ้งโอนและแนบสลิปที่หน้าออเดอร์หรือ `/pay/[voucherId]` — ระบบอ่านสลิปเทียบยอดและบัญชีพร้อมเพย์ **แล้วยอดเข้าคิวรอบัญชี** ที่ `/ops/approvals` (ดูสลิป อนุมัติรับเงิน หรือปฏิเสธพร้อมเหตุผล). ไม่ยืนยันเงินอัตโนมัติจาก OCR. พรีวิว A4 และบันทึก PDF ได้ที่ใบรับเงิน / ใบรับสินค้า / ใบสั่งโรงงาน. ของเสียในใบรับเปิดเคลมโรงงานอัตโนมัติ.

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

Applies `002`–`015` including customers CRM depth, contacts/merge, LINE OA link tokens, Thai orders, PromptPay, VAT documents, factory PO, double-entry ledger, goods receipts, cash receipt lines, supplier pay vs received qty, assets, claims, issue tickets, Gemini 1688/Alibaba catalog photos, payment slips, accounting reject reasons, and ops staff RBAC.

## Limits

- Password users in env (bootstrap) **or** staff in `/ops/users` (hashed in SQLite)
- SQLite single-instance only
- No quote PDF, pricing engine, or ERP write-back
