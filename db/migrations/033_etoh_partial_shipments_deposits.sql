-- Etoh Cols: several delivery notes per order (partial shipments), per-shipment
-- invoice amounts, and container-deposit documents (charge / refund) with a
-- dedicated liability account.

CREATE TABLE IF NOT EXISTS etoh_shipments_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dn_no TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL,
  customer_id INTEGER,
  status TEXT NOT NULL DEFAULT 'shipped' CHECK (status IN ('shipped', 'delivered')),
  ship_to TEXT,
  vehicle TEXT,
  driver TEXT,
  tax_invoice_id TEXT,
  subtotal_ex_vat REAL NOT NULL DEFAULT 0,
  vat_amount REAL NOT NULL DEFAULT 0,
  grand_total REAL NOT NULL DEFAULT 0,
  deposit_thb REAL NOT NULL DEFAULT 0,
  due_date TEXT,
  shipped_at TEXT NOT NULL,
  delivered_at TEXT,
  received_by TEXT,
  created_by TEXT NOT NULL
);

INSERT INTO etoh_shipments_v2 (
  id, dn_no, order_id, customer_id, status, ship_to, vehicle, driver, tax_invoice_id,
  subtotal_ex_vat, vat_amount, grand_total, deposit_thb,
  due_date, shipped_at, delivered_at, received_by, created_by
)
SELECT s.id, s.dn_no, s.order_id, s.customer_id, s.status, s.ship_to, s.vehicle, s.driver, s.tax_invoice_id,
       COALESCE(o.subtotal_ex_vat, 0), COALESCE(o.vat_amount, 0), COALESCE(o.total_amount, 0), 0,
       s.due_date, s.shipped_at, s.delivered_at, s.received_by, s.created_by
FROM etoh_shipments s LEFT JOIN orders o ON o.order_id = s.order_id;

DROP TABLE etoh_shipments;
ALTER TABLE etoh_shipments_v2 RENAME TO etoh_shipments;

CREATE INDEX IF NOT EXISTS idx_etoh_shipments_order
  ON etoh_shipments (order_id, shipped_at);

CREATE INDEX IF NOT EXISTS idx_etoh_shipments_customer
  ON etoh_shipments (customer_id, shipped_at DESC);

CREATE INDEX IF NOT EXISTS idx_etoh_shipments_due
  ON etoh_shipments (due_date);

-- Quantity shipped per order line in each delivery note.
CREATE TABLE IF NOT EXISTS etoh_shipment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  line_index INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  litres REAL NOT NULL CHECK (litres > 0),
  line_total_thb REAL NOT NULL,
  deposit_thb REAL NOT NULL DEFAULT 0,
  UNIQUE (shipment_id, line_index)
);

INSERT INTO etoh_shipment_items (shipment_id, line_index, qty, litres, line_total_thb, deposit_thb)
SELECT shipment_id, line_index, MAX(qty), SUM(litres), 0, 0
FROM etoh_shipment_lots GROUP BY shipment_id, line_index;

-- Container deposit documents: charge (ใบรับเงินมัดจำภาชนะ) and refund (ใบคืนเงินมัดจำ).
-- Not VAT documents: refundable deposits are outside the VAT base.
CREATE TABLE IF NOT EXISTS etoh_deposit_docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('charge', 'refund')),
  customer_id INTEGER NOT NULL,
  shipment_id INTEGER,
  pack_code TEXT,
  qty INTEGER NOT NULL DEFAULT 0,
  amount_thb REAL NOT NULL CHECK (amount_thb > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'void')),
  method TEXT,
  reference TEXT,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  settled_by TEXT,
  settled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_etoh_deposit_docs_customer
  ON etoh_deposit_docs (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_etoh_deposit_docs_status
  ON etoh_deposit_docs (status, kind);

INSERT OR IGNORE INTO ledger_accounts (code, name_th, name_en, type, sort_order) VALUES
  ('2150', 'เงินมัดจำภาชนะรับจากลูกค้า', 'Container deposits held', 'liability', 75);
