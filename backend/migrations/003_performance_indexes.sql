CREATE INDEX IF NOT EXISTS idx_sessions_user_status_started_at
  ON sessions(user_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_answers_created_at
  ON answers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_metrics_created_at
  ON behavior_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_code_submissions_user_submitted_at
  ON code_submissions(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_design_submissions_user_submitted_at
  ON system_design_submissions(user_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboards_rank
  ON leaderboards(rank);

CREATE INDEX IF NOT EXISTS idx_achievement_badges_user_earned_at
  ON achievement_badges(user_id, earned_at DESC);
