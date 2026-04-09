-- Minimal question history + ghost reward daily gate

CREATE TABLE IF NOT EXISTS question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  was_correct BOOLEAN NOT NULL,
  mode TEXT NOT NULL,
  answer_time_sec INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_history_user_date ON question_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_question_history_user_question ON question_history(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_question_history_user_correct ON question_history(user_id, was_correct);

ALTER TABLE question_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own question history" ON question_history;
DROP POLICY IF EXISTS "Users insert own question history" ON question_history;
CREATE POLICY "Users read own question history" ON question_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own question history" ON question_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS ghost_reward_done BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ghost_reward_reset DATE;
