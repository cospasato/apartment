-- ============================================================
-- LODGEOS SAAS PLATFORM — FULL SCHEMA
-- Run entire file in Neon SQL Editor
-- ============================================================

SET search_path TO public;

-- ── PLANS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  price_monthly BIGINT NOT NULL,   -- TZS per month
  price_yearly  BIGINT NOT NULL,   -- TZS per year
  max_locations INTEGER NOT NULL DEFAULT 1,
  max_rooms     INTEGER NOT NULL DEFAULT 10,
  max_staff     INTEGER NOT NULL DEFAULT 3,
  features      TEXT[] NOT NULL DEFAULT '{}',
  active        BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO plans (id, name, price_monthly, price_yearly, max_locations, max_rooms, max_staff, features) VALUES
  ('free',       'Free',       0,        0,         1,   5,   2,  ARRAY['1 location','5 rooms','2 staff','Basic reports']),
  ('starter',    'Starter',    49000,    490000,    2,   20,  5,  ARRAY['2 locations','20 rooms','5 staff','Full reports','Photo uploads']),
  ('pro',        'Pro',        99000,    990000,    10,  100, 20, ARRAY['10 locations','100 rooms','20 staff','Advanced reports','Customer portal','Priority support']),
  ('enterprise', 'Enterprise', 249000,   2490000,   999, 999, 999,ARRAY['Unlimited locations','Unlimited rooms','Unlimited staff','Custom reports','Dedicated support','API access'])
ON CONFLICT (id) DO NOTHING;

-- ── TENANTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY DEFAULT 'T' || upper(substr(md5(random()::text), 1, 8)),
  business_name TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,   -- used in URLs, lowercase
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  country       TEXT NOT NULL DEFAULT 'Tanzania',
  city          TEXT,
  logo_url      TEXT,
  plan_id       TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  password_hash TEXT NOT NULL,
  owner_name    TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id            TEXT PRIMARY KEY DEFAULT 'SUB' || upper(substr(md5(random()::text), 1, 6)),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id       TEXT NOT NULL REFERENCES plans(id),
  cycle         TEXT NOT NULL DEFAULT 'monthly' CHECK (cycle IN ('monthly','yearly')),
  amount        BIGINT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  payment_ref   TEXT,
  payment_method TEXT DEFAULT 'Mobile Money',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LOCATIONS (tenant-scoped) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id          TEXT PRIMARY KEY DEFAULT 'L' || upper(substr(md5(random()::text), 1, 6)),
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  icon        TEXT NOT NULL DEFAULT '🏙️',
  description TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ROOMS (tenant-scoped) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id              TEXT PRIMARY KEY DEFAULT 'R' || upper(substr(md5(random()::text), 1, 6)),
  tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id     TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'Standard',
  beds            INTEGER NOT NULL DEFAULT 1,
  max_guests      INTEGER NOT NULL DEFAULT 2,
  price_per_night BIGINT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','maintenance')),
  amenities       TEXT[] NOT NULL DEFAULT '{}',
  photos          TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── BOOKINGS (tenant-scoped) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id               TEXT PRIMARY KEY DEFAULT 'B' || upper(substr(md5(random()::text), 1, 6)),
  tenant_id        TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id          TEXT REFERENCES rooms(id),
  location_id      TEXT REFERENCES locations(id),
  customer_id      TEXT,
  guest_name       TEXT NOT NULL,
  guest_phone      TEXT NOT NULL,
  guest_email      TEXT,
  guest_nationality TEXT,
  check_in         DATE NOT NULL,
  check_out        DATE NOT NULL,
  nights           INTEGER NOT NULL,
  base_amount      BIGINT NOT NULL,
  discount         NUMERIC NOT NULL DEFAULT 0,
  discount_type    TEXT NOT NULL DEFAULT 'pct' CHECK (discount_type IN ('pct','fix')),
  total_amount     BIGINT NOT NULL,
  paid_amount      BIGINT NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checkedIn','checkedOut','cancelled')),
  payment_method   TEXT NOT NULL DEFAULT 'Cash',
  notes            TEXT,
  staff_id         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── EXPENSES (tenant-scoped) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           TEXT PRIMARY KEY DEFAULT 'E' || upper(substr(md5(random()::text), 1, 6)),
  tenant_id    TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id  TEXT NOT NULL REFERENCES locations(id),
  category     TEXT NOT NULL,
  description  TEXT NOT NULL,
  amount       BIGINT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  staff_id     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── STAFF (tenant-scoped) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id          TEXT PRIMARY KEY DEFAULT 'S' || upper(substr(md5(random()::text), 1, 6)),
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'Receptionist',
  location_id TEXT REFERENCES locations(id),
  pin_hash    TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ── CUSTOMERS (tenant-scoped) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY DEFAULT 'C' || upper(substr(md5(random()::text), 1, 6)),
  tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  nationality   TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ── SUPER ADMIN ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
  id            TEXT PRIMARY KEY DEFAULT 'SA' || upper(substr(md5(random()::text), 1, 6)),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default super admin (change password immediately after setup!)
INSERT INTO super_admins (id, name, email, password_hash) VALUES
  ('SA001', 'Platform Admin', 'super@lodgeos.com', 'super1234')
ON CONFLICT (id) DO NOTHING;

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_locations_tenant  ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_tenant      ON rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant   ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant   ON expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tenant      ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant  ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subs_tenant       ON subscriptions(tenant_id);
