-- Etoh Cols sales flow: quote → order, delivery notes with lot allocation,
-- and customer follow-up log for reorder reminders.

ALTER TABLE etoh_quotes ADD COLUMN order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_etoh_quotes_order
  ON etoh_quotes (order_id);

-- One ethanol order row per converted quote (the order itself lives in `orders`).
CREATE TABLE IF NOT EXISTS etoh_orders (
  order_id TEXT PRIMARY KEY NOT NULL,
  quote_id INTEGER NOT NULL UNIQUE,
  customer_id INTEGER,
  credit_term_days INTEGER NOT NULL DEFAULT 0,
  lines_json TEXT NOT NULL,
  deposit_thb REAL NOT NULL DEFAULT 0,
  total_litres REAL NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etoh_orders_customer
  ON etoh_orders (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS etoh_shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dn_no TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  status TEXT NOT NULL DEFAULT 'shipped' CHECK (status IN ('shipped', 'delivered')),
  ship_to TEXT,
  vehicle TEXT,
  driver TEXT,
  tax_invoice_id TEXT,
  due_date TEXT,
  shipped_at TEXT NOT NULL,
  delivered_at TEXT,
  received_by TEXT,
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etoh_shipments_customer
  ON etoh_shipments (customer_id, shipped_at DESC);

CREATE INDEX IF NOT EXISTS idx_etoh_shipments_due
  ON etoh_shipments (due_date);

CREATE TABLE IF NOT EXISTS etoh_shipment_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  line_index INTEGER NOT NULL,
  sku TEXT NOT NULL,
  grade_code TEXT NOT NULL,
  pack_code TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  lot_id INTEGER NOT NULL,
  litres REAL NOT NULL CHECK (litres > 0),
  FOREIGN KEY (shipment_id) REFERENCES etoh_shipments (id),
  FOREIGN KEY (lot_id) REFERENCES etoh_lots (id)
);

CREATE INDEX IF NOT EXISTS idx_etoh_shipment_lots_lot
  ON etoh_shipment_lots (lot_id);

CREATE TABLE IF NOT EXISTS etoh_followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('ordered', 'quote_sent', 'call_back', 'not_now', 'no_answer', 'lost')),
  note TEXT,
  next_date TEXT,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etoh_followups_customer
  ON etoh_followups (customer_id, created_at DESC);
