-- ============================================
-- Remove prize total CHECK constraint
-- Allows admin override for special cases (re-buys, etc.)
-- ============================================

-- Remove the prize totals check constraint
-- Constraint name from 001_initial_schema.sql: prize_totals_check
ALTER TABLE game_nights DROP CONSTRAINT IF EXISTS prize_totals_check;

-- Add column to track when validation was manually overridden
ALTER TABLE game_nights ADD COLUMN IF NOT EXISTS validation_overridden BOOLEAN DEFAULT FALSE;
