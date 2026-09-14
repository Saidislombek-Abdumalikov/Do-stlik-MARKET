-- ============================================================
-- DO'STLIK MARKET — TO'LIQ SUPABASE SOZLASH SKRIPTI (ALL-IN-ONE)
-- Supabase Dashboard -> SQL Editor ga qo'yib, 'Run' tugmasini bosing!
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE debt_direction AS ENUM ('customer', 'supplier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE debt_status AS ENUM ('open', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'worker');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE admin_action_type AS ENUM (
    'edit',
    'delete',
    'manual_add',
    'worker_add',
    'worker_deactivate',
    'worker_activate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. PROFILES TABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL DEFAULT 'worker',
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  pin_code VARCHAR(4) NOT NULL DEFAULT '0000',
  avatar_color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. ENTRIES TABLE (CENTRAL DEBT RECORDS) ─────────────────
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction debt_direction NOT NULL DEFAULT 'customer',
  party_name TEXT NOT NULL,
  party_phone TEXT,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  status debt_status NOT NULL DEFAULT 'open',
  description TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_by_name TEXT,
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_by_name TEXT,
  last_edited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. ENTRY HISTORY TABLE (DEBT AUDIT TRAIL) ───────────────
CREATE TABLE IF NOT EXISTS entry_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_by_name TEXT NOT NULL,
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value JSONB,
  new_value JSONB,
  changes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. ADMIN ACTION LOG TABLE (OWNER AUDIT LOG) ─────────────
CREATE TABLE IF NOT EXISTS admin_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  action_type admin_action_type NOT NULL,
  target_entry_id UUID,
  target_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  deleted_entry_snapshot JSONB,
  deleted_entry_history_snapshot JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 6. INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
CREATE INDEX IF NOT EXISTS idx_entries_direction ON entries(direction);
CREATE INDEX IF NOT EXISTS idx_entries_due_date ON entries(due_date);
CREATE INDEX IF NOT EXISTS idx_entries_created_by ON entries(created_by);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_party_phone ON entries(party_phone);
CREATE INDEX IF NOT EXISTS idx_entry_history_entry_id ON entry_history(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_history_created_at ON entry_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_created_at ON admin_action_log(created_at DESC);

-- ── 7. ATOMIC DELETION RPC: delete_entry_with_snapshot ──────
CREATE OR REPLACE FUNCTION delete_entry_with_snapshot(
  p_entry_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_history JSONB;
  v_admin_name TEXT;
  v_admin_id UUID := COALESCE(auth.uid(), p_admin_id);
BEGIN
  SELECT full_name INTO v_admin_name FROM profiles WHERE id = v_admin_id;

  SELECT * INTO v_entry FROM entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Qarz yozuvi topilmadi (ID: %)', p_entry_id;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(h)), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT * FROM entry_history WHERE entry_id = p_entry_id ORDER BY created_at ASC
  ) h;

  INSERT INTO admin_action_log (
    admin_user_id,
    admin_name,
    action_type,
    target_entry_id,
    summary,
    deleted_entry_snapshot,
    deleted_entry_history_snapshot,
    metadata
  ) VALUES (
    v_admin_id,
    COALESCE(v_admin_name, 'Do‘kon egasi'),
    'delete',
    p_entry_id,
    format('%s qarzi butunlay o‘chirildi: %s (%s so‘m)', 
      CASE WHEN v_entry.direction = 'customer' THEN 'Mijoz' ELSE 'Yetkazib beruvchi' END,
      v_entry.party_name,
      to_char(v_entry.amount, 'FM999,999,999,999')
    ),
    to_jsonb(v_entry),
    v_history,
    jsonb_build_object('reason', p_reason, 'deleted_at', now())
  );

  DELETE FROM entries WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_entry_id,
    'message', 'Qarz muvaffaqiyatli o‘chirildi va doimiy snapshot arxivlandi.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION delete_entry_with_snapshot TO anon, authenticated;

-- ── 8. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;

-- Anon/Store Cashier Policies (4-digit PIN frontend access)
DROP POLICY IF EXISTS "anon_profiles_select" ON profiles;
CREATE POLICY "anon_profiles_select" ON profiles FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_profiles_update" ON profiles;
CREATE POLICY "anon_profiles_update" ON profiles FOR UPDATE TO anon USING (true);

DROP POLICY IF EXISTS "anon_entries_select" ON entries;
CREATE POLICY "anon_entries_select" ON entries FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_entries_insert" ON entries;
CREATE POLICY "anon_entries_insert" ON entries FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "anon_entries_update" ON entries;
CREATE POLICY "anon_entries_update" ON entries FOR UPDATE TO anon USING (true);
DROP POLICY IF EXISTS "anon_entries_delete" ON entries;
CREATE POLICY "anon_entries_delete" ON entries FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "anon_entry_history_select" ON entry_history;
CREATE POLICY "anon_entry_history_select" ON entry_history FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_entry_history_insert" ON entry_history;
CREATE POLICY "anon_entry_history_insert" ON entry_history FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon_admin_action_log_select" ON admin_action_log;
CREATE POLICY "anon_admin_action_log_select" ON admin_action_log FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_admin_action_log_insert" ON admin_action_log;
CREATE POLICY "anon_admin_action_log_insert" ON admin_action_log FOR INSERT TO anon WITH CHECK (true);

-- Authenticated User Policies (owner / dashboard auth)
DROP POLICY IF EXISTS "auth_profiles_all" ON profiles;
CREATE POLICY "auth_profiles_all" ON profiles FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_entries_all" ON entries;
CREATE POLICY "auth_entries_all" ON entries FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_entry_history_all" ON entry_history;
CREATE POLICY "auth_entry_history_all" ON entry_history FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "auth_admin_action_log_all" ON admin_action_log;
CREATE POLICY "auth_admin_action_log_all" ON admin_action_log FOR ALL TO authenticated USING (true);

-- ── 9. SEED OFFICIAL STAFF PROFILES ─────────────────────────
INSERT INTO profiles (id, role, full_name, phone, pin_code, avatar_color, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Sohibboy', '+998901234501', '7777', 'from-violet-600 to-purple-600', true),
  ('00000000-0000-0000-0000-000000000002', 'worker', 'Sayfullo', '+998901234502', '2222', 'from-emerald-600 to-teal-600', true),
  ('00000000-0000-0000-0000-000000000003', 'worker', 'Abubakir', '+998901234503', '1111', 'from-blue-600 to-indigo-600', true)
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  pin_code = EXCLUDED.pin_code,
  avatar_color = EXCLUDED.avatar_color,
  is_active = true;

-- ── 10. REALTIME ENABLEMENT ─────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE entries;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_action_log;
