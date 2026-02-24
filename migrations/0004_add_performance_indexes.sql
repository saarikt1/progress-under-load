-- Indexes for performance & responsiveness in Phase 10
-- Prevent table scans when looking up exercises by user and sets by exercise
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_sets_user_id_source_hash ON sets(user_id, source_row_hash);
