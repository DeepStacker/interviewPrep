ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS interview_type VARCHAR(50) DEFAULT 'mixed';

ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS integrity_flags JSONB,
  ADD COLUMN IF NOT EXISTS validation_summary TEXT;

UPDATE sessions
SET interview_type = 'mixed'
WHERE interview_type IS NULL;
