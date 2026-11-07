-- The therapist's short reply when marking a workout as seen (also sent as a notification).
ALTER TABLE workout_sessions ADD COLUMN IF NOT EXISTS review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 500);
