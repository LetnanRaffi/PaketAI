-- Fix circular RLS on users table
-- The old policy queried users FROM users policy = infinite recursion

-- 1. Drop broken policies
DROP POLICY IF EXISTS "users_select_own_org" ON users;

-- 2. Simple policy: user can only read their own row
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    id = auth.uid()
  );

-- 3. Create a SECURITY DEFINER function to get org_id (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;

-- 4. Fix employees RLS to use the function instead of circular subquery
DROP POLICY IF EXISTS "employees_select_org" ON employees;
DROP POLICY IF EXISTS "employees_insert_org" ON employees;
DROP POLICY IF EXISTS "employees_update_org" ON employees;
DROP POLICY IF EXISTS "employees_delete_org" ON employees;

CREATE POLICY "employees_select_org" ON employees
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "employees_insert_org" ON employees
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "employees_update_org" ON employees
  FOR UPDATE USING (org_id = get_user_org_id());

CREATE POLICY "employees_delete_org" ON employees
  FOR DELETE USING (org_id = get_user_org_id());

-- 5. Fix packages RLS too
DROP POLICY IF EXISTS "packages_select_org" ON packages;
DROP POLICY IF EXISTS "packages_insert_org" ON packages;
DROP POLICY IF EXISTS "packages_update_org" ON packages;
DROP POLICY IF EXISTS "packages_delete_org" ON packages;

CREATE POLICY "packages_select_org" ON packages
  FOR SELECT USING (org_id = get_user_org_id());

CREATE POLICY "packages_insert_org" ON packages
  FOR INSERT WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "packages_update_org" ON packages
  FOR UPDATE USING (org_id = get_user_org_id());

CREATE POLICY "packages_delete_org" ON packages
  FOR DELETE USING (org_id = get_user_org_id());

-- 6. Fix org RLS too
DROP POLICY IF EXISTS "org_select_own" ON organizations;
CREATE POLICY "org_select_own" ON organizations
  FOR SELECT USING (id = get_user_org_id());

-- 7. Fix subscriptions RLS
DROP POLICY IF EXISTS "subscriptions_select_own_org" ON subscriptions;
CREATE POLICY "subscriptions_select_own_org" ON subscriptions
  FOR SELECT USING (org_id = get_user_org_id());
