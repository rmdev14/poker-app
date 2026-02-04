-- ============================================
-- Poker Tracker - Initial Schema
-- Phase 1: Tables and Seed Data
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prize chart lookup table
CREATE TABLE prize_chart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    num_players INTEGER UNIQUE NOT NULL,
    first_prize INTEGER NOT NULL,
    second_prize INTEGER NOT NULL,
    third_prize INTEGER NOT NULL,
    pot INTEGER NOT NULL,
    CONSTRAINT prize_chart_totals_check
        CHECK (first_prize + second_prize + third_prize + pot = num_players * 20)
);

-- Game nights table
CREATE TABLE game_nights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_date DATE UNIQUE NOT NULL,
    attendance_count INTEGER NOT NULL,
    pot_amount INTEGER NOT NULL,
    first_place_player_id UUID NOT NULL REFERENCES players(id),
    first_place_prize INTEGER NOT NULL,
    second_place_player_id UUID NOT NULL REFERENCES players(id),
    second_place_prize INTEGER NOT NULL,
    third_place_player_id UUID NOT NULL REFERENCES players(id),
    third_place_prize INTEGER NOT NULL,
    prizes_adjusted BOOLEAN DEFAULT FALSE,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT attendance_count_range CHECK (attendance_count BETWEEN 12 AND 36),
    CONSTRAINT prize_totals_check
        CHECK (first_place_prize + second_place_prize + third_place_prize + pot_amount = attendance_count * 20),
    CONSTRAINT unique_place_players
        CHECK (first_place_player_id != second_place_player_id
           AND first_place_player_id != third_place_player_id
           AND second_place_player_id != third_place_player_id),
    CONSTRAINT positive_prizes
        CHECK (first_place_prize > 0 AND second_place_prize > 0 AND third_place_prize > 0 AND pot_amount > 0)
);

-- Attendances table
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_night_id UUID NOT NULL REFERENCES game_nights(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id),
    buy_in INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_player_per_game UNIQUE (game_night_id, player_id),
    CONSTRAINT positive_buy_in CHECK (buy_in > 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_game_nights_date ON game_nights(game_date DESC);
CREATE INDEX idx_attendances_game_night ON attendances(game_night_id);
CREATE INDEX idx_attendances_player ON attendances(player_id);

-- ============================================
-- SEED DATA: Players (38 total)
-- ============================================

INSERT INTO players (name) VALUES
    ('Andy'),
    ('Anthony'),
    ('Barry'),
    ('Bhudda'),
    ('Calum'),
    ('Calvin'),
    ('Chic'),
    ('Conrad'),
    ('Cooky'),
    ('Darren'),
    ('Daniel'),
    ('David'),
    ('Eddie T'),
    ('Euan'),
    ('Graeme'),
    ('Greg'),
    ('Jack'),
    ('James'),
    ('Joe'),
    ('Kyra'),
    ('Liam'),
    ('Mark'),
    ('Matthew'),
    ('Michael'),
    ('Mick Burns'),
    ('Pat'),
    ('Ritchie'),
    ('Ross 1'),
    ('Ross 2'),
    ('Ryan C'),
    ('Sandy'),
    ('Sam'),
    ('Sean'),
    ('Sher'),
    ('Seamus'),
    ('Sweeney'),
    ('Wullie'),
    ('William');

-- ============================================
-- SEED DATA: Prize Chart (12 to 36 players)
-- Format: num_players, first_prize, second_prize, third_prize, pot
-- ============================================

INSERT INTO prize_chart (num_players, first_prize, second_prize, third_prize, pot) VALUES
    (12, 100, 60, 40, 40),
    (13, 110, 70, 40, 40),
    (14, 120, 80, 40, 40),
    (15, 130, 80, 40, 50),
    (16, 140, 80, 40, 60),
    (17, 150, 80, 50, 60),
    (18, 160, 90, 50, 60),
    (19, 170, 100, 50, 60),
    (20, 180, 100, 50, 70),
    (21, 190, 100, 60, 70),
    (22, 200, 110, 60, 70),
    (23, 210, 120, 60, 70),
    (24, 220, 120, 70, 70),
    (25, 230, 120, 80, 70),
    (26, 240, 130, 80, 70),
    (27, 250, 140, 80, 70),
    (28, 260, 150, 80, 70),
    (29, 270, 160, 80, 70),
    (30, 280, 170, 80, 70),
    (31, 290, 180, 80, 70),
    (32, 300, 190, 80, 70),
    (33, 310, 200, 80, 70),
    (34, 320, 210, 80, 70),
    (35, 330, 220, 80, 70),
    (36, 340, 230, 80, 70);
