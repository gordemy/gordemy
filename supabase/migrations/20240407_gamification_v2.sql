-- ─────────────────────────────────────────────────────────────────────────────
-- Gordemy Gamification v2 — new tables for Duels, Clans, and misc columns
-- Run this in Supabase SQL Editor (or via Supabase CLI)
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Add new columns to students ───────────────────────────────────────────

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS gems              INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_xp         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_shields    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_weekly_reset DATE,
  ADD COLUMN IF NOT EXISTS clan_id           UUID,
  ADD COLUMN IF NOT EXISTS daily_quest_claimed JSONB DEFAULT '[]'::jsonb;


-- ── 2. Clans ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  emoji         TEXT NOT NULL DEFAULT '🔥',
  description   TEXT DEFAULT '',
  owner_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  member_count  INTEGER DEFAULT 1,
  total_xp      INTEGER DEFAULT 0,
  weekly_xp     INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clan_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id     UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'member' CHECK (role IN ('owner','elder','member')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id)  -- one clan per student
);

-- RLS
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clans" ON clans FOR SELECT USING (true);
CREATE POLICY "Owner can update clan" ON clans FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated can create clan" ON clans FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Anyone can read clan_members" ON clan_members FOR SELECT USING (true);
CREATE POLICY "Authenticated can join/leave" ON clan_members FOR ALL USING (auth.uid() = student_id);


-- ── 3. Duel Challenges ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS duel_challenges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenger_name   TEXT NOT NULL,
  opponent_id       UUID REFERENCES students(id) ON DELETE SET NULL,
  opponent_name     TEXT,
  subject           TEXT NOT NULL,
  difficulty        TEXT NOT NULL DEFAULT 'medium',
  question_ids      UUID[] NOT NULL,
  challenger_score  INTEGER DEFAULT -1,
  opponent_score    INTEGER DEFAULT -1,
  challenger_time   INTEGER DEFAULT 0,  -- seconds
  opponent_time     INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','expired')),
  winner_id         UUID REFERENCES students(id),
  xp_reward         INTEGER DEFAULT 120,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  expires_at        TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

ALTER TABLE duel_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can see their duels" ON duel_challenges
  FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "Challenger can create duel" ON duel_challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Players can update their duel" ON duel_challenges
  FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);


-- ── 4. Mystery Box Claims ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mystery_box_claims (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  reward_type   TEXT NOT NULL,
  reward_value  INTEGER NOT NULL,
  reward_label  TEXT,
  claimed_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

ALTER TABLE mystery_box_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own mystery claims" ON mystery_box_claims
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students claim mystery box" ON mystery_box_claims
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update mystery box" ON mystery_box_claims
  FOR UPDATE USING (auth.uid() = student_id);


-- ── 5. Night Challenge Attempts ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS night_challenge_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  question_id UUID REFERENCES questions(id),
  won         BOOLEAN NOT NULL DEFAULT false,
  xp_earned   INTEGER DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, date)
);

ALTER TABLE night_challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own night attempts" ON night_challenge_attempts
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students create night attempt" ON night_challenge_attempts
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update night attempt" ON night_challenge_attempts
  FOR UPDATE USING (auth.uid() = student_id);


-- ── 6. Ghost Snapshots ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ghost_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  xp_earned         INTEGER DEFAULT 0,
  tasks_completed   INTEGER DEFAULT 0,
  correct_answers   INTEGER DEFAULT 0,
  UNIQUE (student_id, date)
);

ALTER TABLE ghost_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see all ghosts" ON ghost_snapshots FOR SELECT USING (true);
CREATE POLICY "Students manage own ghost" ON ghost_snapshots
  FOR ALL USING (auth.uid() = student_id);


-- ── 7. Boss Fights & Attempts ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS boss_fights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE NOT NULL UNIQUE,
  boss_name   TEXT NOT NULL,
  boss_emoji  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  difficulty  TEXT NOT NULL DEFAULT 'hard',
  xp_reward   INTEGER DEFAULT 300,
  hp          INTEGER DEFAULT 100,
  description TEXT
);

CREATE TABLE IF NOT EXISTS boss_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  boss_id       UUID NOT NULL REFERENCES boss_fights(id) ON DELETE CASCADE,
  won           BOOLEAN DEFAULT false,
  score         INTEGER DEFAULT 0,
  damage_dealt  INTEGER DEFAULT 0,
  attempted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id, boss_id)
);

ALTER TABLE boss_fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE boss_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read boss fights" ON boss_fights FOR SELECT USING (true);
CREATE POLICY "Service can create boss fights" ON boss_fights FOR INSERT WITH CHECK (true);
CREATE POLICY "Students see boss attempts" ON boss_attempts FOR SELECT USING (true);
CREATE POLICY "Students create boss attempts" ON boss_attempts
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update boss attempts" ON boss_attempts
  FOR UPDATE USING (auth.uid() = student_id);


-- ── 8. Useful indexes ─────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_duel_challenger ON duel_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_duel_opponent ON duel_challenges(opponent_id);
CREATE INDEX IF NOT EXISTS idx_duel_status ON duel_challenges(status);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_ghost_student_date ON ghost_snapshots(student_id, date);
CREATE INDEX IF NOT EXISTS idx_mystery_student_date ON mystery_box_claims(student_id, date);
CREATE INDEX IF NOT EXISTS idx_night_student_date ON night_challenge_attempts(student_id, date);
CREATE INDEX IF NOT EXISTS idx_boss_attempts_boss ON boss_attempts(boss_id);


-- ── Done! ─────────────────────────────────────────────────────────────────────
-- After running this: deploy your Next.js app and all new features should work.
