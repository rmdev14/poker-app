-- ============================================
-- Lower minimum attendance count and relax prize constraints
-- Allows game nights with fewer than 12 players
-- ============================================

-- Drop and re-add attendance range constraint with lower minimum
ALTER TABLE game_nights DROP CONSTRAINT IF EXISTS attendance_count_range;
ALTER TABLE game_nights ADD CONSTRAINT attendance_count_range
    CHECK (attendance_count BETWEEN 1 AND 36);

-- Drop and re-add positive prizes constraint to allow zero values
-- when prizes are set (non-null). Null prizes are already allowed
-- for games without winners yet.
ALTER TABLE game_nights DROP CONSTRAINT IF EXISTS positive_prizes;
ALTER TABLE game_nights ADD CONSTRAINT positive_prizes
    CHECK (
        first_place_prize IS NULL
        OR (first_place_prize >= 0 AND second_place_prize >= 0 AND third_place_prize >= 0 AND pot_amount >= 0)
    );
