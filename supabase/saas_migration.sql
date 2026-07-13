-- =============================================================
-- SaaS B2B Migration: Multi-tenant + Subscription
-- Run this AFTER the initial migration.sql
-- =============================================================

-- 1. Organizations (tenant)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  amount NUMERIC NOT NULL DEFAULT 159000,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  temanqris_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Add org_id to existing tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 5. Create default org for existing data (run once)
INSERT INTO organizations (id, name, slug, plan, trial_ends_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'active', now() + INTERVAL '365 days')
ON CONFLICT (id) DO NOTHING;

-- 6. Backfill existing employees and packages with default org
UPDATE employees SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE packages SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

-- 7. Create subscription for default org
INSERT INTO subscriptions (org_id, status, amount, current_period_start, current_period_end)
VALUES ('00000000-0000-0000-0000-000000000001', 'active', 159000, now(), now() + INTERVAL '365 days')
ON CONFLICT DO NOTHING;

-- 8. Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies for organizations
CREATE POLICY "org_select_own" ON organizations
  FOR SELECT USING (
    id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR id = '00000000-0000-0000-0000-000000000001'
  );

-- 10. RLS Policies for users
CREATE POLICY "users_select_own_org" ON users
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- 11. RLS Policies for subscriptions
CREATE POLICY "subscriptions_select_own_org" ON subscriptions
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 12. Replace open policies on employees with org-scoped ones
DROP POLICY IF EXISTS "Authenticated users can select employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON employees;

CREATE POLICY "employees_select_org" ON employees
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "employees_insert_org" ON employees
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "employees_update_org" ON employees
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "employees_delete_org" ON employees
  FOR DELETE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 13. Replace open policies on packages with org-scoped ones
DROP POLICY IF EXISTS "Authenticated users can select packages" ON packages;
DROP POLICY IF EXISTS "Authenticated users can insert packages" ON packages;
DROP POLICY IF EXISTS "Authenticated users can update packages" ON packages;
DROP POLICY IF EXISTS "Authenticated users can delete packages" ON packages;

CREATE POLICY "packages_select_org" ON packages
  FOR SELECT USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "packages_insert_org" ON packages
  FOR INSERT WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "packages_update_org" ON packages
  FOR UPDATE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "packages_delete_org" ON packages
  FOR DELETE USING (
    org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- 14. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(org_id);
CREATE INDEX IF NOT EXISTS idx_packages_org_id ON packages(org_id);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
