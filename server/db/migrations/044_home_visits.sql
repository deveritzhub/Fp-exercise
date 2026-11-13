-- A professional who treats the patient may look into the patient's home in the practice village:
-- which pieces of furniture stand where. Reading only; the layout stays the patient's to change.
-- The app tells the patient so where the home is furnished.
CREATE POLICY homes_read_staff ON hero_homes FOR SELECT TO fp_app USING (app.can_manage_patient(patient_id));
