-- Ghost mode MVP support: keep daily performance snapshot

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS response_time_sec INTEGER;

ALTER TABLE ghost_snapshots
  ADD COLUMN IF NOT EXISTS avg_response_sec INTEGER,
  ADD COLUMN IF NOT EXISTS answers_count INTEGER DEFAULT 0;
