-- ============================================================
-- DO'STLIK MARKET — SHOP DEBT TRACKING SYSTEM
-- Canonical Supabase Database Schema Migration
-- ============================================================

-- ── 1. ENUMS ────────────────────────────────────────────────
CREATE TYPE debt_direction AS ENUM ('customer', 'supplier');
CREATE TYPE debt_status AS ENUM ('open', 'paid');
CREATE TYPE user_role AS ENUM ('owner', 'worker');
CREATE TYPE admin_action_type AS ENUM (
  'edit',
  'delete',
  'manual_add',
  'worker_add',
  'worker_deactivate',
  'worker_activate'
);

-- ── 2. PROFILES TABLE ───────────────────────────────────────
-- Maps 1-to-1 with auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'worker',
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. ENTRIES TABLE (CENTRAL DEBT RECORDS) ─────────────────
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  direction debt_direction NOT NULL, -- 'customer' (Mijoz qarzi) or 'supplier' (Yetkazib beruvchi qarzi)
  party_name TEXT NOT NULL,          -- Mijoz yoki Yetkazib beruvchi ismi
  party_phone TEXT,                  -- Telefon raqami
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0), -- Qarz summasi (so'm)
  status debt_status NOT NULL DEFAULT 'open',         -- 'open' (Ochiq) or 'paid' (To'langan)
  description TEXT,                  -- Izoh / mahsulotlar / eslatma
  due_date DATE,                     -- To'lash muddati
  paid_at TIMESTAMPTZ,               -- To'langan sana (average time-to-payment uchun muhim)
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Kiritgan ishchi yoki egasi
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
  change_type TEXT NOT NULL,          -- 'created', 'edited', 'status_changed'
  field_name TEXT,                    -- qaysi maydon o'zgargani
  old_value JSONB,
  new_value JSONB,
  changes JSONB,                      -- Strukturaviy farq: { "amount": { "old": 100000, "new": 150000 } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. ADMIN ACTION LOG TABLE (OWNER AUDIT LOG) ─────────────
CREATE TABLE IF NOT EXISTS admin_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_name TEXT NOT NULL,
  action_type admin_action_type NOT NULL, -- 'edit', 'delete', 'manual_add', 'worker_add', etc.
  target_entry_id UUID,                   -- Qarz id si (agar mavjud bo'lsa)
  target_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,                  -- O'zbek tilidagi qisqacha tavsif
  before_data JSONB,                      -- O'zgarishdan oldingi holat
  after_data JSONB,                       -- Yangilangan yoki qo'shilgan holat
  deleted_entry_snapshot JSONB,           -- O'chirilgan qarzning to'liq nusxasi
  deleted_entry_history_snapshot JSONB,   -- O'chirilgan qarzning butun entry_history tarixi
  metadata JSONB,                         -- Qo'shimcha ma'lumotlar (brauzer, IP, sabab)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 6. INDEXES FOR PERFORMANCE ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
CREATE INDEX IF NOT EXISTS idx_entries_direction ON entries(direction);
CREATE INDEX IF NOT EXISTS idx_entries_due_date ON entries(due_date);
CREATE INDEX IF NOT EXISTS idx_entries_created_by ON entries(created_by);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_party_name ON entries USING gin (to_tsvector('simple', party_name));
CREATE INDEX IF NOT EXISTS idx_entries_party_phone ON entries(party_phone);

CREATE INDEX IF NOT EXISTS idx_entry_history_entry_id ON entry_history(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_history_created_at ON entry_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_action_log_created_at ON admin_action_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_action_type ON admin_action_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_action_log_target_entry ON admin_action_log(target_entry_id);

-- ── 7. HELPER FUNCTION: is_owner() ──────────────────────────
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'owner'
      AND is_active = true
  );
$$;

-- ── 8. ATOMIC DELETION RPC: delete_entry_with_snapshot ──────
-- Requirement 17 & 18: Atomically capture entry + all history before deleting
CREATE OR REPLACE FUNCTION delete_entry_with_snapshot(
  p_entry_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
  v_history JSONB;
  v_admin_name TEXT;
  v_admin_id UUID := auth.uid();
BEGIN
  -- 1. Xavfsizlik tekshiruvi: faqat do'kon egasi o'chira oladi
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'Ruxsat etilmagan amal: faqat do‘kon egasi qarzni o‘chira oladi.';
  END IF;

  -- 2. Egasi ismini olish
  SELECT full_name INTO v_admin_name FROM profiles WHERE id = v_admin_id;

  -- 3. Qarz yozuvini tekshirish va tranzaksiyaga qulflash
  SELECT * INTO v_entry FROM entries WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Qarz yozuvi topilmadi (ID: %)', p_entry_id;
  END IF;

  -- 4. Ushbu qarzning to'liq entry_history tarixini JSONB massivga yig'ish
  SELECT COALESCE(jsonb_agg(to_jsonb(h)), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT * FROM entry_history WHERE entry_id = p_entry_id ORDER BY created_at ASC
  ) h;

  -- 5. admin_action_log ga to'liq snapshot va o'chirish amalini saqlash
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

  -- 6. Qarzni o'chirish
  DELETE FROM entries WHERE id = p_entry_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_entry_id,
    'message', 'Qarz muvaffaqiyatli o‘chirildi va doimiy snapshot arxivlandi.'
  );
END;
$$;

-- ── 9. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;

-- 9.1 PROFILES POLICIES
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT USING (
    is_owner() OR id = auth.uid()
  );

CREATE POLICY "profiles_modify_policy" ON profiles
  FOR ALL USING (
    is_owner()
  );

-- 9.2 ENTRIES POLICIES
CREATE POLICY "entries_select_policy" ON entries
  FOR SELECT USING (
    is_owner() OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
    )
  );

CREATE POLICY "entries_insert_policy" ON entries
  FOR INSERT WITH CHECK (
    is_owner() OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
    )
  );

CREATE POLICY "entries_update_policy" ON entries
  FOR UPDATE USING (
    is_owner() OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
    )
  );

-- FAQAT DO'KON EGASI O'CHIRA OLADI. Ishchilar uchun DELETE mutlaqo taqiqlangan!
CREATE POLICY "entries_delete_policy" ON entries
  FOR DELETE USING (
    is_owner()
  );

-- 9.3 ENTRY_HISTORY POLICIES
CREATE POLICY "entry_history_select_policy" ON entry_history
  FOR SELECT USING (
    is_owner() OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
    )
  );

CREATE POLICY "entry_history_insert_policy" ON entry_history
  FOR INSERT WITH CHECK (
    is_owner() OR (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active = true)
    )
  );

CREATE POLICY "entry_history_no_update" ON entry_history
  FOR UPDATE USING (false);

-- 9.4 ADMIN_ACTION_LOG POLICIES
CREATE POLICY "admin_action_log_select_policy" ON admin_action_log
  FOR SELECT USING (
    is_owner()
  );

CREATE POLICY "admin_action_log_insert_policy" ON admin_action_log
  FOR INSERT WITH CHECK (
    is_owner()
  );

CREATE POLICY "admin_action_log_no_update" ON admin_action_log
  FOR UPDATE USING (false);

CREATE POLICY "admin_action_log_no_delete" ON admin_action_log
  FOR DELETE USING (false);

-- ── 10. REALTIME ENABLEMENT ─────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE entries;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_action_log;
