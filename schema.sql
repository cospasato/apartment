-- ============================================================
-- BNC APARTMENT — DATABASE SCHEMA
-- Run this entire file in: Neon Console → SQL Editor → Run
-- ============================================================

-- Make sure we're in the public schema
SET search_path TO public;

-- LOCATIONS
CREATE TABLE IF NOT EXISTS locations (
  id          TEXT        PRIMARY KEY DEFAULT 'L' || upper(substr(md5(random()::text), 1, 6)),
  name        TEXT        NOT NULL,
  city        TEXT        NOT NULL,
  address     TEXT        NOT NULL DEFAULT '',
  icon        TEXT        NOT NULL DEFAULT '🏙️',
  description TEXT        NOT NULL DEFAULT '',
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id             TEXT        PRIMARY KEY DEFAULT 'R' || upper(substr(md5(random()::text), 1, 6)),
  location_id    TEXT        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  type           TEXT        NOT NULL DEFAULT 'Standard',
  beds           INTEGER     NOT NULL DEFAULT 1,
  max_guests     INTEGER     NOT NULL DEFAULT 2,
  price_per_night BIGINT     NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'available'
                             CHECK (status IN ('available','occupied','maintenance')),
  amenities      TEXT[]      NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT        PRIMARY KEY DEFAULT 'B' || upper(substr(md5(random()::text), 1, 6)),
  room_id          TEXT        REFERENCES rooms(id),
  location_id      TEXT        REFERENCES locations(id),
  guest_name       TEXT        NOT NULL,
  guest_phone      TEXT        NOT NULL,
  guest_email      TEXT,
  guest_nationality TEXT,
  check_in         DATE        NOT NULL,
  check_out        DATE        NOT NULL,
  nights           INTEGER     NOT NULL,
  base_amount      BIGINT      NOT NULL,
  discount         NUMERIC     NOT NULL DEFAULT 0,
  discount_type    TEXT        NOT NULL DEFAULT 'pct'
                               CHECK (discount_type IN ('pct','fix')),
  total_amount     BIGINT      NOT NULL,
  paid_amount      BIGINT      NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','confirmed','checkedIn','checkedOut','cancelled')),
  payment_method   TEXT        NOT NULL DEFAULT 'Cash',
  notes            TEXT,
  staff_id         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id           TEXT        PRIMARY KEY DEFAULT 'E' || upper(substr(md5(random()::text), 1, 6)),
  location_id  TEXT        NOT NULL REFERENCES locations(id),
  category     TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  amount       BIGINT      NOT NULL,
  expense_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  staff_id     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STAFF
CREATE TABLE IF NOT EXISTS staff (
  id          TEXT        PRIMARY KEY DEFAULT 'S' || upper(substr(md5(random()::text), 1, 6)),
  name        TEXT        NOT NULL,
  email       TEXT        UNIQUE NOT NULL,
  phone       TEXT,
  role        TEXT        NOT NULL DEFAULT 'Receptionist',
  location_id TEXT        REFERENCES locations(id),
  pin_hash    TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO locations (id, name, city, address, icon, description) VALUES
  ('L1', 'BNC Msasani',    'Dar es Salaam', 'Msasani Peninsula, DSM',  '🏙️', 'Upscale waterfront property in the heart of the peninsula'),
  ('L2', 'BNC Mikocheni',  'Dar es Salaam', 'Mikocheni B, DSM',        '🌿', 'Serene garden property away from the city bustle'),
  ('L3', 'BNC Stone Town', 'Zanzibar',      'Stone Town, Zanzibar',    '🏛️', 'Heritage property in historic Stone Town')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rooms (id, location_id, name, type, beds, max_guests, price_per_night, status, amenities) VALUES
  ('R1','L1','Penthouse Suite',   'Suite',     2,4,280000,'available',  ARRAY['WiFi','AC','Pool','Kitchen','Parking']),
  ('R2','L1','Deluxe Ocean View', 'Deluxe',    1,2,180000,'available',  ARRAY['WiFi','AC','Sea View','Breakfast']),
  ('R3','L1','Standard Room A',   'Standard',  1,2, 95000,'available',  ARRAY['WiFi','AC','TV']),
  ('R4','L1','Family Apartment',  'Apartment', 3,6,320000,'available',  ARRAY['WiFi','AC','Kitchen','Parking']),
  ('R5','L2','Garden Cottage',    'Cottage',   1,2,140000,'available',  ARRAY['WiFi','AC','Garden','Breakfast']),
  ('R6','L2','Executive Studio',  'Studio',    1,2,110000,'maintenance',ARRAY['WiFi','AC','Kitchenette']),
  ('R7','L2','Premium Suite',     'Suite',     2,4,260000,'available',  ARRAY['WiFi','AC','Lounge','Kitchen']),
  ('R8','L3','Heritage Room',     'Standard',  1,2,130000,'available',  ARRAY['WiFi','AC','Historic View']),
  ('R9','L3','Sultan Suite',      'Suite',     2,4,310000,'available',  ARRAY['WiFi','AC','Rooftop','Breakfast'])
ON CONFLICT (id) DO NOTHING;

-- Staff accounts (pin_hash stores PIN as plain text for demo — use bcrypt in production)
INSERT INTO staff (id, name, email, phone, role, location_id, pin_hash, active) VALUES
  ('ADMIN', 'BNC Admin',    'admin@bnc.co.tz',  NULL,              'Admin',        NULL, '0000', true),
  ('S1',    'Jane Mwangi',  'jane@bnc.co.tz',   '+255 712 000 001','Manager',      'L1', '1234', true),
  ('S2',    'Peter Salum',  'peter@bnc.co.tz',  '+255 754 000 002','Receptionist', 'L3', '5678', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VERIFY — run this after to confirm tables exist
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;

-- ============================================================
-- MIGRATION: Add photos column to rooms (run if upgrading)
-- ============================================================
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS photos TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================
-- MIGRATION: Add customers table (run if upgrading)
-- ============================================================
CREATE TABLE IF NOT EXISTS customers (
  id          TEXT        PRIMARY KEY DEFAULT 'C' || upper(substr(md5(random()::text), 1, 6)),
  name        TEXT        NOT NULL,
  email       TEXT        UNIQUE NOT NULL,
  phone       TEXT,
  nationality TEXT,
  password_hash TEXT      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link bookings to customer accounts (optional — existing bookings keep NULL)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id TEXT REFERENCES customers(id);

-- ============================================================
-- MIGRATION: Payment methods (admin-configurable)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id         TEXT PRIMARY KEY DEFAULT 'PM' || upper(substr(md5(random()::text), 1, 5)),
  name       TEXT NOT NULL UNIQUE,
  active     BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payment_methods (name, sort_order) VALUES
  ('Cash', 1), ('Mobile Money', 2), ('Bank Transfer', 3), ('Card', 4)
ON CONFLICT (name) DO NOTHING;
