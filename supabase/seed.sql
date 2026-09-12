-- ============================================================
-- DO'STLIK MARKET — SEED & INITIAL SETUP SCRIPT
-- Run this after running the migration in Supabase SQL Editor
-- ============================================================

-- NOTE: To assign an owner to your Supabase Auth user:
-- 1. Create a user via Supabase Auth Dashboard or Login screen.
-- 2. Run the following query replacing 'YOUR_USER_UUID' with the actual user ID:
/*
INSERT INTO profiles (id, role, full_name, phone, is_active)
VALUES ('YOUR_USER_UUID', 'owner', 'Do‘kon Egasi (Saidislom)', '+998901234567', true)
ON CONFLICT (id) DO UPDATE SET role = 'owner', is_active = true;
*/

-- Sample workers (for development / testing):
-- These can be linked to real auth.users when created.
