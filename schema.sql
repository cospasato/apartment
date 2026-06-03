-- ============================================================
-- BNBMIS — BNB MANAGEMENT SYSTEM — SUPER APP DATABASE SCHEMA
-- Run this entire file in: Neon Console → SQL Editor → Run
-- ============================================================

SET search_path TO public;

-- ============================================================
-- PLATFORM TABLES (new)
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT        PRIMARY KEY DEFAULT 'PLN' || upper(substr(md5(random()::text), 1, 5)),
  name          TEXT        NOT NULL UNIQUE,
  price_monthly BIGINT      NOT NULL DEFAULT 0,
  price_yearly  BIGINT      NOT NULL DEFAULT 0,
  max_locations INTEGER     NOT NULL DEFAULT 1,
  max_rooms     INTEGER     NOT NULL DEFAULT 10,
  max_staff     INTEGER     NOT NULL DEFAULT 2,
  features      TEXT[]      NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_owners (
  id            TEXT        PRIMARY KEY DEFAULT 'OWN' || upper(substr(md5(random()::text), 1, 5)),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  phone         TEXT,
  country       TEXT        NOT NULL DEFAULT 'TZ',
  password_hash TEXT        NOT NULL,
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stores (
  id          TEXT        PRIMARY KEY DEFAULT 'ST' || lpad((floor(random()*9000+1000)::int)::text, 4, '0'),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  owner_id    TEXT        NOT NULL REFERENCES store_owners(id),
  plan_id     TEXT        REFERENCES subscription_plans(id),
  status      TEXT        NOT NULL DEFAULT 'trial'
                          CHECK (status IN ('trial','active','suspended','terminated','pending')),
  logo_url       TEXT,
  featured_image TEXT,
  description    TEXT        NOT NULL DEFAULT '',
  country     TEXT        NOT NULL DEFAULT 'TZ',
  city        TEXT        NOT NULL DEFAULT '',
  phone       TEXT,
  email       TEXT,
  website     TEXT,
  trial_ends  DATE        NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                   TEXT        PRIMARY KEY DEFAULT 'SUB' || upper(substr(md5(random()::text), 1, 5)),
  store_id             TEXT        NOT NULL REFERENCES stores(id),
  plan_id              TEXT        NOT NULL REFERENCES subscription_plans(id),
  billing_cycle        TEXT        NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly')),
  amount               BIGINT      NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','past_due','cancelled','trialing')),
  current_period_start DATE        NOT NULL DEFAULT CURRENT_DATE,
  current_period_end   DATE        NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id              TEXT        PRIMARY KEY DEFAULT 'SPAY' || upper(substr(md5(random()::text), 1, 5)),
  store_id        TEXT        NOT NULL REFERENCES stores(id),
  subscription_id TEXT        REFERENCES subscriptions(id),
  amount          BIGINT      NOT NULL,
  method          TEXT        NOT NULL DEFAULT 'Manual',
  reference       TEXT,
  notes           TEXT,
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by     TEXT
);

CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS super_admins (
  id            TEXT        PRIMARY KEY DEFAULT 'SAD' || upper(substr(md5(random()::text), 1, 5)),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  active        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORE-SCOPED TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS locations (
  id          TEXT        PRIMARY KEY DEFAULT 'L' || upper(substr(md5(random()::text), 1, 6)),
  store_id    TEXT        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  city        TEXT        NOT NULL,
  address     TEXT        NOT NULL DEFAULT '',
  icon        TEXT        NOT NULL DEFAULT '🏙️',
  description TEXT        NOT NULL DEFAULT '',
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
  id              TEXT        PRIMARY KEY DEFAULT 'R' || upper(substr(md5(random()::text), 1, 6)),
  location_id     TEXT        NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  store_id        TEXT        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  type            TEXT        NOT NULL DEFAULT 'Standard',
  beds            INTEGER     NOT NULL DEFAULT 1,
  max_guests      INTEGER     NOT NULL DEFAULT 2,
  price_per_night BIGINT      NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'available'
                              CHECK (status IN ('available','occupied','maintenance')),
  amenities       TEXT[]      NOT NULL DEFAULT '{}',
  photos          TEXT[]      NOT NULL DEFAULT '{}',
  video_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff (
  id          TEXT        PRIMARY KEY DEFAULT 'S' || upper(substr(md5(random()::text), 1, 6)),
  store_id    TEXT        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  phone       TEXT,
  role        TEXT        NOT NULL DEFAULT 'Receptionist',
  location_id TEXT        REFERENCES locations(id),
  pin_hash    TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE TABLE IF NOT EXISTS customers (
  id            TEXT        PRIMARY KEY DEFAULT 'C' || upper(substr(md5(random()::text), 1, 6)),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  phone         TEXT,
  nationality   TEXT,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT        PRIMARY KEY DEFAULT 'B' || upper(substr(md5(random()::text), 1, 6)),
  store_id         TEXT        REFERENCES stores(id),
  room_id          TEXT        REFERENCES rooms(id),
  location_id      TEXT        REFERENCES locations(id),
  customer_id      TEXT        REFERENCES customers(id),
  guest_name       TEXT        NOT NULL,
  guest_phone      TEXT        NOT NULL,
  guest_email      TEXT,
  guest_nationality TEXT,
  check_in         DATE        NOT NULL,
  check_out        DATE        NOT NULL,
  nights           INTEGER     NOT NULL,
  base_amount      BIGINT      NOT NULL,
  discount         NUMERIC     NOT NULL DEFAULT 0,
  discount_type    TEXT        NOT NULL DEFAULT 'pct' CHECK (discount_type IN ('pct','fix')),
  total_amount     BIGINT      NOT NULL,
  paid_amount      BIGINT      NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','confirmed','checkedIn','checkedOut','cancelled')),
  payment_method   TEXT        NOT NULL DEFAULT 'Cash',
  notes            TEXT,
  staff_id         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id           TEXT        PRIMARY KEY DEFAULT 'E' || upper(substr(md5(random()::text), 1, 6)),
  store_id     TEXT        REFERENCES stores(id),
  location_id  TEXT        NOT NULL REFERENCES locations(id),
  category     TEXT        NOT NULL,
  description  TEXT        NOT NULL,
  amount       BIGINT      NOT NULL,
  expense_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  staff_id     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id         TEXT    PRIMARY KEY DEFAULT 'PM' || upper(substr(md5(random()::text), 1, 5)),
  store_id   TEXT    REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, name)
);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT        PRIMARY KEY DEFAULT 'REV' || upper(substr(md5(random()::text), 1, 5)),
  store_id    TEXT        NOT NULL REFERENCES stores(id),
  room_id     TEXT        REFERENCES rooms(id),
  booking_id  TEXT        REFERENCES bookings(id),
  customer_id TEXT        NOT NULL REFERENCES customers(id),
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_locations_store    ON locations(store_id);
CREATE INDEX IF NOT EXISTS idx_rooms_store        ON rooms(store_id);
CREATE INDEX IF NOT EXISTS idx_rooms_location     ON rooms(location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_store     ON bookings(store_id);
CREATE INDEX IF NOT EXISTS idx_bookings_location  ON bookings(location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room      ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer  ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_staff_store        ON staff(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store     ON expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_store ON subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_stores_owner       ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_status      ON stores(status);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO subscription_plans (id, name, price_monthly, price_yearly, max_locations, max_rooms, max_staff, features, sort_order) VALUES
  ('PLN001', 'Free Trial',    0,       0,         1,   10,  2,   ARRAY['Basic booking','Reports'],                                           0),
  ('PLN002', 'Starter',       29000,   290000,    1,   15,  3,   ARRAY['Basic booking','Reports','Customer portal'],                         1),
  ('PLN003', 'Professional',  79000,   790000,    5,   50,  10,  ARRAY['Everything in Starter','Multi-location','Analytics','Priority support'], 2),
  ('PLN004', 'Enterprise',    199000,  1990000,   999, 999, 999, ARRAY['Unlimited everything','Custom branding','API access','Dedicated support'], 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_settings (key, value) VALUES
  ('platform_name',     'BNBMIS'),
  ('platform_currency', 'TZS'),
  ('support_email',     'support@bnbmis.com'),
  ('trial_days',        '14'),
  ('platform_tagline',  'BNB Management Information System')
ON CONFLICT (key) DO NOTHING;

-- Super admin (CHANGE THIS PASSWORD AFTER FIRST LOGIN via the super admin dashboard)
INSERT INTO super_admins (id, name, email, password_hash) VALUES
  ('SADMIN', 'BNBMIS Admin', 'admin@bnbmis.com', 'Admin@2024!')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- MIGRATION: Run this if you already have the database set up
-- (safe to run multiple times — uses IF NOT EXISTS)
-- ============================================================
ALTER TABLE stores ADD COLUMN IF NOT EXISTS featured_image TEXT;

-- If existing stores have long IDs, no action needed — new stores will get short IDs
-- Store IDs are now format: ST + 4 chars, e.g. STABCD (easy to share with staff)

-- ============================================================
-- MIGRATION: Add featured_image column if not exists
-- ============================================================
ALTER TABLE stores ADD COLUMN IF NOT EXISTS featured_image TEXT;
