-- Weak areas MVP persistence

CREATE TABLE IF NOT EXISTS weak_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  completion_progress INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_weak_areas_user ON weak_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_weak_areas_progress ON weak_areas(user_id, completion_progress);

ALTER TABLE weak_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own weak areas" ON weak_areas;
DROP POLICY IF EXISTS "Users write own weak areas" ON weak_areas;
CREATE POLICY "Users read own weak areas" ON weak_areas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users write own weak areas" ON weak_areas
  FOR ALL USING (auth.uid() = user_id);
