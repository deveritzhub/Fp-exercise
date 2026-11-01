-- A patient may play as a guest hero: a real person's photo offered with their consent (e.g. the
-- practice owner). The allowed keys come from the server configuration (HERO_GUESTS).
ALTER TABLE patient_heroes ADD COLUMN photo_key text CHECK (photo_key IS NULL OR photo_key ~ '^custom_[a-z0-9_]{1,30}$');
GRANT UPDATE (photo_key) ON patient_heroes TO fp_app;
