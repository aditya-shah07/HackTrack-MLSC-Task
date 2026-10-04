-- ============================================
-- HackPulse — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HACKATHONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hackathons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 3,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_by TEXT, -- device ID of the organizer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_number INTEGER,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'being_evaluated', 'evaluated', 'away')),
  eval_position INTEGER DEFAULT 0,
  device_id TEXT, -- device ID of the team (for "no accounts" approach)
  score_innovation INTEGER DEFAULT 0,
  score_accuracy INTEGER DEFAULT 0,
  score_ui INTEGER DEFAULT 0,
  score_privacy INTEGER DEFAULT 0,
  score_community INTEGER DEFAULT 0,
  score_total INTEGER DEFAULT 0,
  eval_notes TEXT DEFAULT '',
  is_eliminated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  hackathon_id UUID NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_teams_hackathon ON teams(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(hackathon_id, status);
CREATE INDEX IF NOT EXISTS idx_announcements_hackathon ON announcements(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathons_join_code ON hackathons(join_code);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- For a hackathon app, we keep it open (no auth)
-- but limit to basic read/write operations
-- ============================================

-- Enable RLS
ALTER TABLE hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Allow public access (since constraint #0 = no accounts)
-- In production, you'd want more restrictive policies

-- Hackathons: anyone can create, read, and update
CREATE POLICY "hackathons_select" ON hackathons FOR SELECT USING (true);
CREATE POLICY "hackathons_insert" ON hackathons FOR INSERT WITH CHECK (true);
CREATE POLICY "hackathons_update" ON hackathons FOR UPDATE USING (true);

-- Teams: anyone can read, create, and update teams
CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (true);

-- Announcements: anyone can read, create, and delete
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "announcements_delete" ON announcements FOR DELETE USING (true);

-- ============================================
-- ENABLE REALTIME
-- Required for live updates
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE hackathons;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
