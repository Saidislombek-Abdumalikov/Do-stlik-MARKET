-- ============================================================
-- DO'STLIK MARKET — SEED & INITIAL SETUP SCRIPT
-- Run this in Supabase SQL Editor after 20260912_initial_schema.sql
-- ============================================================

-- Insert the 3 official staff accounts:
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

