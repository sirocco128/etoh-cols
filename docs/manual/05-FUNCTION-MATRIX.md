# Function Matrix — Premium Gift Set Web

ตรวจครบจาก `app/**/page.tsx` และ `app/api/**/route.ts` ณ 2026-09-06  
คอลัมน์คู่มือชี้ไปที่หัวข้อใน [02-USER-MANUAL.md](./02-USER-MANUAL.md)

## สัญลักษณ์ Role

| รหัส | ความหมาย |
|------|----------|
| P | Public / ลูกค้า |
| S | Sales |
| A | Accountant |
| AD | Admin |
| V | Viewer |
| CMS | Strapi editor (นอก Ops) |

---

## 1. Storefront สาธารณะ

| # | Route | ฟังก์ชัน | Role | คู่มือ |
|---|-------|----------|------|-------|
| 1 | `/` | หน้าแรก | P | §5.1 |
| 2 | `/about` | เกี่ยวกับบริษัท | P | §5.1 |
| 3 | `/premium-giftset` | Landing ของขวัญพรีเมียม | P | §5.1 |
| 4 | `/products` | แคตตาล็อก + เปรียบเทียบ | P | §5.2 |
| 5 | `/products/[slug]` | รายละเอียดสินค้า / mockup / RFQ | P | §5.2 |
| 6 | `/giftset/[category]` | หมวดของขวัญ | P | §5.2 |
| 7 | `/ideas` `/ideas/[slug]` | ธีมไอเดีย | P | §5.3 |
| 8 | `/customize-gift-set` | กำหนดเซ็ตสั่งทำ | P | §5.3 |
| 9 | `/quote-basket` | ตะกร้าขอราคา (ไม่ชำระเงิน) | P | §5.4 |
| 10 | `/catalog` `/catalog/[category]` | Flip catalog | P | §5.5 |
| 11 | `/album/[albumId]` | อัลบั้มแคตตาล็อกภายในที่เผยแพร่ | P | §5.5 |
| 12 | `/portfolio` `/portfolio/[slug]` | ผลงาน | P | §5.6 |
| 13 | `/blog` `/blog/[slug]` | บทความ SEO | P | §5.6 |
| 14 | `/contact` | RFQ / ข้อความติดต่อ | P | §5.7 |
| 15 | `/account` | ศูนย์ลูกค้า (ลิงก์ออเดอร์/แจ้งปัญหา) | P | §5.8 |
| 16 | `/orders` `/orders/[orderId]` | ค้นหา/ดูออเดอร์ (token) | P | §5.8 |
| 17 | `/orders/.../documents/...` | เอกสารบัญชีลูกค้า | P | §5.8 |
| 18 | `/pay/[voucherId]` | ชำระตาม voucher + แนบสลิป | P | §5.9 |
| 19 | `/issues` | แจ้งปัญหาหลังขาย | P | §5.10 |
| 20 | `/book/[slug]` | จองนัดกับพนักงาน | P | §5.11 |
| 21 | `/privacy` `/terms` | นโยบาย / ข้อกำหนด | P | §5.12 |

## 2. Ops — เข้าสู่ระบบ / ภาพรวม

| # | Route | ฟังก์ชัน | Role | คู่มือ |
|---|-------|----------|------|-------|
| 22 | `/ops/login` | เข้าสู่ระบบ (รหัสผ่าน / Google) | ทั้งหมด | §3 |
| 23 | `/ops` | Dashboard | S A AD V | §4 |
| 24 | `/ops/board` | บอร์ดงาน / สถานะ | S A AD V | §5.13 |
| 25 | `/ops/forbidden` | ไม่มีสิทธิ์ | — | §7 |

## 3. Ops — ขาย / CRM

| # | Route | ฟังก์ชัน | Role | คู่มือ |
|---|-------|----------|------|-------|
| 26 | `/ops/quotes` `[requestId]` | คำขอใบเสนอราคา | S AD V | §5.14 |
| 27 | `/ops/inquiries` | กล่องติดต่อ/ร้องเรียน | S AD V | §5.15 |
| 28 | `/ops/customers` (+new/id/import) | CRM ลูกค้า / merge / export | S AD V | §5.16 |
| 29 | `/ops/orders` `[orderId]` | ออเดอร์ + ลิงก์ลูกค้า | S A AD V | §5.17 |
| 30 | `/ops/assistant` | ผู้ช่วยเซลล์ | S AD | §5.18 |
| 31 | `/ops/line-lab` | ทดสอบ LINE bind | S AD | §5.18 |
| 32 | `/ops/schedule` (+new/id/availability) | ปฏิทิน / นัดหมาย | S AD V | §5.19 |

## 4. Ops — สินค้า / ราคา / แคตตาล็อก

| # | Route | ฟังก์ชัน | Role | คู่มือ |
|---|-------|----------|------|-------|
| 33 | `/ops/pricing` `import` | เครื่องคิดราคา / Excel | S AD | §5.20 |
| 34 | `/ops/products` (+new/id/ori/colors/groups/bundle) | SKU master A/B/C/D | AD (S อ่านตามสิทธิ์) | §5.21 |
| 35 | `/ops/catalog-books` | สร้างอัลบั้มแคตตาล็อก | S AD | §5.22 |
| 36 | `/ops/catalog-images` | ค้นหา/เก็บรูป 1688 | S AD | §5.22 |

## 5. Ops — จัดซื้อ / คลัง

| # | Route | ฟังก์ชัน | Role | คู่มือ |
|---|-------|----------|------|-------|
| 37 | `/ops/factories` | ทะเบียนโรงงาน | AD | §5.23 |
| 38 | `/ops/factory-po` (+new/id/print) | ใบสั่งโรงงานจีน | AD | §5.24 |
| 39 | `/ops/inbound` | รับสินค้าเข้า | AD | §5.25 |
| 40 | `/ops/pay-factory` | จ่ายโรงงาน/ค่าขนส่ง | AD A | §5.26 |
| 41 | `/ops/assets` | ล็อตสินทรัพย์คลัง | AD | §5.27 |
| 42 | `/ops/claims` | เคลม | AD A | §5.28 |
| 43 | `/ops/issues` | คิวปัญหาภายใน | S AD | §5.28 |
| 44 | `/ops/holds` | Legal hold | AD | §5.29 |

## 6. Ops — การเงิน / วงจร

| # | Route | ฟังก์ชัน | Role | คู่มือ |
|---|-------|----------|------|-------|
| 45 | `/ops/approvals` (+pay/rv) | อนุมัติสลิป | A AD | §5.30 |
| 46 | `/ops/receipts` | ใบรับเงิน | A AD | §5.31 |
| 47 | `/ops/qr-pay` | สร้าง PromptPay QR | S A AD | §5.31 |
| 48 | `/ops/cycle` | ศูนย์ลิงก์วงจรปฏิบัติการ | S A AD | §5.32 |
| 49 | `/ops/reports` | รายงานวงจรรายได้ | ตามสิทธิ์ | §6 |
| 50 | `/ops/finance` (+coa/journals/ledger/TB/BS/CF/manual) | บัญชีแยกประเภท / งบ | A AD | §6 |

## 7. Ops — เนื้อหา / ระบบ

| # | Route | ฟังก์ชัน | Role | คู่มือ |
|---|-------|----------|------|-------|
| 51 | `/ops/blog` (+new/id) | บทความ editorial | S AD | §5.33 |
| 52 | `/ops/seo` | SEO override | S AD | §5.33 |
| 53 | `/ops/audit` | Audit log / export | AD | §5.34 |
| 54 | `/ops/users` `[id]` | RBAC พนักงาน | AD | §5.35 |
| 55 | Strapi admin | CMS เผยแพร่ | CMS | §5.36 |

## 8. API handlers

| API | ใช้ทำ | หมายเหตุ |
|-----|--------|----------|
| `/api/health` | Health check | Deploy |
| `/api/revalidate` | ISR revalidate | Auth secret |
| `/api/jobs/retry-quotes` | Retry webhook RFQ | Cron secret |
| `/api/company-lookup` | ค้นหาเลขผู้เสียภาษี | Public rate-limit |
| `/api/thai-address` | ที่อยู่ไทย | Public |
| `/api/mockup/generate` | AI mockup | Rate-limit |
| `/api/assistant/chat` | Buyer assistant | Rate-limit |
| `/api/line/webhook` | LINE OA | Signature |
| `/api/ops/*` | Ops assistants, SEO, FX, docs, catalog, Google OAuth | Session |

---

**เช็คครบ:** ทุก `page.tsx` ต้องมีแถวในตารางนี้ เมื่อเพิ่มหน้าใหม่ให้อัปเดตไฟล์นี้ก่อนแก้คู่มือ
