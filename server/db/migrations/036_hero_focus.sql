-- The therapist can choose the skill of the weekly skill quest ("this week: Balance") instead of the
-- automatic rotation. Stored as a short history of {skill, from} (from = Monday of the week it
-- starts), so past weeks keep the skill they had and XP never changes afterwards. skill null = back
-- to the automatic rotation. Only professionals change it (route checks app.can_manage_patient).
ALTER TABLE patients ADD COLUMN hero_focus jsonb NOT NULL DEFAULT '[]'
  CHECK (jsonb_typeof(hero_focus) = 'array' AND jsonb_array_length(hero_focus) <= 60);
GRANT UPDATE (hero_focus) ON patients TO fp_app;
