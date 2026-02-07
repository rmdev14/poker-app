-- ============================================
-- Enable Row-Level Security on all tables
-- Admin UID: 9a560621-fbc1-43d4-8d3e-619f63f151ec
-- ============================================

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_nights ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (safe if they don't exist)
-- ============================================

DROP POLICY IF EXISTS "Public read on players" ON players;
DROP POLICY IF EXISTS "Admin insert on players" ON players;
DROP POLICY IF EXISTS "Admin update on players" ON players;
DROP POLICY IF EXISTS "Admin delete on players" ON players;

DROP POLICY IF EXISTS "Public read on prize_chart" ON prize_chart;
DROP POLICY IF EXISTS "Admin insert on prize_chart" ON prize_chart;
DROP POLICY IF EXISTS "Admin update on prize_chart" ON prize_chart;
DROP POLICY IF EXISTS "Admin delete on prize_chart" ON prize_chart;

DROP POLICY IF EXISTS "Public read on game_nights" ON game_nights;
DROP POLICY IF EXISTS "Admin insert on game_nights" ON game_nights;
DROP POLICY IF EXISTS "Admin update on game_nights" ON game_nights;
DROP POLICY IF EXISTS "Admin delete on game_nights" ON game_nights;

DROP POLICY IF EXISTS "Public read on attendances" ON attendances;
DROP POLICY IF EXISTS "Admin insert on attendances" ON attendances;
DROP POLICY IF EXISTS "Admin update on attendances" ON attendances;
DROP POLICY IF EXISTS "Admin delete on attendances" ON attendances;

-- ============================================
-- HELPER: Check if the current user is admin
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT auth.uid() = '9a560621-fbc1-43d4-8d3e-619f63f151ec'::uuid
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- PLAYERS
-- ============================================

CREATE POLICY "Public read on players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Admin insert on players"
  ON players FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin update on players"
  ON players FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin delete on players"
  ON players FOR DELETE
  USING (is_admin());

-- ============================================
-- PRIZE_CHART
-- ============================================

CREATE POLICY "Public read on prize_chart"
  ON prize_chart FOR SELECT
  USING (true);

CREATE POLICY "Admin insert on prize_chart"
  ON prize_chart FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin update on prize_chart"
  ON prize_chart FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin delete on prize_chart"
  ON prize_chart FOR DELETE
  USING (is_admin());

-- ============================================
-- GAME_NIGHTS
-- ============================================

CREATE POLICY "Public read on game_nights"
  ON game_nights FOR SELECT
  USING (true);

CREATE POLICY "Admin insert on game_nights"
  ON game_nights FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin update on game_nights"
  ON game_nights FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin delete on game_nights"
  ON game_nights FOR DELETE
  USING (is_admin());

-- ============================================
-- ATTENDANCES
-- ============================================

CREATE POLICY "Public read on attendances"
  ON attendances FOR SELECT
  USING (true);

CREATE POLICY "Admin insert on attendances"
  ON attendances FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin update on attendances"
  ON attendances FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admin delete on attendances"
  ON attendances FOR DELETE
  USING (is_admin());
