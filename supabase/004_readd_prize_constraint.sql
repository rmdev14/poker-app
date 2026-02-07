-- ============================================
-- Re-add prize totals constraint with override support
-- Allows manual override when validation_overridden = true
-- ============================================

ALTER TABLE game_nights ADD CONSTRAINT prize_totals_check
    CHECK (
        validation_overridden = true
        OR first_place_prize IS NULL
        OR (first_place_prize + second_place_prize + third_place_prize + pot_amount = attendance_count * 20)
    );
