PRAGMA foreign_keys = ON;

ALTER TABLE orders RENAME TO orders_legacy;

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  legacy_order_id TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  table_number TEXT,
  waiter_name TEXT,
  waiter_phone TEXT,
  order_date_iso TEXT,
  order_date_epoch_ms INTEGER,
  status TEXT,
  price_cents INTEGER,
  raw_order_id TEXT NOT NULL,
  raw_order_date TEXT,
  raw_status TEXT,
  raw_metadata TEXT,
  raw_price TEXT,
  raw_food_items TEXT,
  metadata_json TEXT,
  metadata_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  item_text TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

INSERT INTO orders (
  legacy_order_id,
  customer_name,
  customer_phone,
  table_number,
  waiter_name,
  waiter_phone,
  order_date_iso,
  order_date_epoch_ms,
  status,
  price_cents,
  raw_order_id,
  raw_order_date,
  raw_status,
  raw_metadata,
  raw_price,
  raw_food_items,
  metadata_json,
  metadata_text
)
SELECT
  TRIM(order_id) AS legacy_order_id,
  NULLIF(TRIM(customer_name), '') AS customer_name,
  NULLIF(TRIM(customer_phone), '') AS customer_phone,
  NULLIF(TRIM(table_number), '') AS table_number,
  NULLIF(TRIM(waiter_name), '') AS waiter_name,
  NULLIF(TRIM(waiter_phone), '') AS waiter_phone,
  CASE
    WHEN order_date GLOB '____-__-__T*' THEN order_date
    WHEN order_date GLOB '____-__-__' THEN order_date || 'T00:00:00Z'
    ELSE NULL
  END AS order_date_iso,
  CASE
    WHEN order_date GLOB '[0-9]*' AND length(order_date) >= 10 THEN CAST(order_date AS INTEGER)
    ELSE NULL
  END AS order_date_epoch_ms,
  CASE
    WHEN LOWER(TRIM(status)) IN ('1', 'active') THEN 'active'
    WHEN LOWER(TRIM(status)) = 'inactive' THEN 'inactive'
    WHEN TRIM(status) = '' THEN NULL
    ELSE LOWER(TRIM(status))
  END AS status,
  CASE
    WHEN TRIM(price) = '' THEN NULL
    WHEN REPLACE(TRIM(price), '$', '') GLOB '*[0-9]*'
      THEN CAST(ROUND(CAST(REPLACE(REPLACE(TRIM(price), '$', ''), ',', '.') AS REAL) * 100) AS INTEGER)
    ELSE NULL
  END AS price_cents,
  order_id AS raw_order_id,
  order_date AS raw_order_date,
  status AS raw_status,
  metadata AS raw_metadata,
  price AS raw_price,
  food_items AS raw_food_items,
  CASE
    WHEN (metadata LIKE '{%' OR metadata LIKE '[%') AND json_valid(metadata) THEN metadata
    WHEN (metadata LIKE '"{%' OR metadata LIKE '"[%') AND json_valid(metadata) THEN json_extract(metadata, '$')
    ELSE NULL
  END AS metadata_json,
  CASE
    WHEN metadata LIKE '{%' OR metadata LIKE '[%' OR metadata LIKE '"{%' OR metadata LIKE '"[%'
      THEN NULL
    ELSE metadata
  END AS metadata_text
FROM orders_legacy;

INSERT INTO order_items (order_id, item_text, position)
SELECT
  o.id,
  TRIM(l.food_items) AS item_text,
  0 AS position
FROM orders o
JOIN orders_legacy l ON TRIM(l.order_id) = o.legacy_order_id
WHERE l.food_items IS NOT NULL
  AND NULLIF(TRIM(l.food_items), '') IS NOT NULL;

CREATE INDEX idx_orders_legacy_order_id ON orders(legacy_order_id);
CREATE INDEX idx_order_items_order_id_position ON order_items(order_id, position);

DROP TABLE orders_legacy;