-- Etoh Cols core: ethanol price list, packaging / tier settings, customer
-- commercial terms, import lots with CoA, returnable container ledger,
-- saved quotes, and a NEXTERP sync outbox (group-level aggregation).

CREATE TABLE IF NOT EXISTS etoh_price_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade_code TEXT NOT NULL,
  base_price_per_litre REAL NOT NULL CHECK (base_price_per_litre > 0),
  landed_cost_per_litre REAL CHECK (landed_cost_per_litre IS NULL OR landed_cost_per_litre > 0),
  effective_from TEXT NOT NULL,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etoh_price_list_grade_date
  ON etoh_price_list (grade_code, effective_from DESC, id DESC);

CREATE TABLE IF NOT EXISTS etoh_pack_settings (
  pack_code TEXT PRIMARY KEY NOT NULL,
  container_cost_thb REAL NOT NULL DEFAULT 0 CHECK (container_cost_thb >= 0),
  deposit_thb REAL NOT NULL DEFAULT 0 CHECK (deposit_thb >= 0),
  repack_cost_thb REAL NOT NULL DEFAULT 0 CHECK (repack_cost_thb >= 0),
  small_pack_markup_pct REAL NOT NULL DEFAULT 0 CHECK (small_pack_markup_pct >= 0),
  active INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS etoh_tier_settings (
  tier_code TEXT PRIMARY KEY NOT NULL,
  discount_pct REAL NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct < 100),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS etoh_customer_terms (
  customer_id INTEGER PRIMARY KEY NOT NULL,
  price_tier TEXT NOT NULL DEFAULT 'standard',
  credit_limit_thb REAL NOT NULL DEFAULT 0 CHECK (credit_limit_thb >= 0),
  credit_term_days INTEGER NOT NULL DEFAULT 0 CHECK (credit_term_days >= 0),
  reorder_cycle_days INTEGER CHECK (reorder_cycle_days IS NULL OR reorder_cycle_days > 0),
  end_use_segment TEXT,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS etoh_lots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lot_no TEXT NOT NULL UNIQUE,
  grade_code TEXT NOT NULL,
  supplier_name TEXT,
  origin_country TEXT,
  container_no TEXT,
  bl_no TEXT,
  arrival_date TEXT,
  received_litres REAL NOT NULL DEFAULT 0 CHECK (received_litres >= 0),
  coa_purity_pct REAL CHECK (coa_purity_pct IS NULL OR (coa_purity_pct > 0 AND coa_purity_pct <= 100)),
  coa_object_key TEXT,
  fda_ref TEXT,
  expiry_date TEXT,
  status TEXT NOT NULL DEFAULT 'quarantine'
    CHECK (status IN ('quarantine', 'released', 'blocked', 'depleted')),
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etoh_lots_grade_status
  ON etoh_lots (grade_code, status, arrival_date DESC);

CREATE TABLE IF NOT EXISTS etoh_drum_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  pack_code TEXT NOT NULL,
  qty_delta INTEGER NOT NULL CHECK (qty_delta <> 0),
  deposit_per_unit_thb REAL NOT NULL DEFAULT 0 CHECK (deposit_per_unit_thb >= 0),
  ref_type TEXT,
  ref_id TEXT,
  memo TEXT,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etoh_drum_ledger_customer
  ON etoh_drum_ledger (customer_id, pack_code, created_at DESC);

CREATE TABLE IF NOT EXISTS etoh_quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_tax_id TEXT,
  contact TEXT,
  applied_tier TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  grand_total_thb REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  valid_until TEXT,
  note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_etoh_quotes_customer
  ON etoh_quotes (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_etoh_quotes_status
  ON etoh_quotes (status, created_at DESC);

CREATE TABLE IF NOT EXISTS etoh_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Outbox for NEXTERP (group consolidation). Each business app writes events
-- here in the same transaction as the business change; a worker delivers
-- them to NEXTERP and marks them sent. Delivery is at-least-once, so
-- NEXTERP must upsert by (source_app, entity, entity_id).
CREATE TABLE IF NOT EXISTS etoh_sync_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_etoh_sync_outbox_status
  ON etoh_sync_outbox (status, id);
