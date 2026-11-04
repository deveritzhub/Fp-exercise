import type { Tx } from '../db';

const TEXT = {
  program_assigned: {
    nl: (t: string) => ({ title: 'Nieuw oefenprogramma', body: `Je fysiotherapeut heeft "${t}" voor je klaargezet.` }),
    en: (t: string) => ({ title: 'New exercise programme', body: `Your physiotherapist has prepared "${t}" for you.` }),
  },
  program_updated: {
    nl: (t: string) => ({ title: 'Programma bijgewerkt', body: `Je fysiotherapeut heeft "${t}" aangepast.` }),
    en: (t: string) => ({ title: 'Programme updated', body: `Your physiotherapist has updated "${t}".` }),
  },
} as const;

/** In-app notification to the patient's login (if the patient has activated an account). */
export async function notifyPatientUser(
  tx: Tx,
  patientId: string,
  practiceId: string,
  kind: keyof typeof TEXT,
  programTitle: string,
) {
  const { rows } = await tx.query('SELECT user_id, locale FROM patients WHERE id = $1', [patientId]);
  if (!rows[0]?.user_id) return;
  const msg = TEXT[kind][rows[0].locale as 'nl' | 'en'](programTitle);
  await tx.query(
    'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
    [rows[0].user_id, practiceId, kind, msg.title, msg.body, '/p'],
  );
}

/**
 * A muscle card from the atlas, sent by the professional ("lees over deze spier"), with an optional
 * short note. Returns false when the patient has no login yet.
 */
export async function notifyPatientMuscle(tx: Tx, patientId: string, practiceId: string, muscle: { key: string; nl: string; en: string }, note: string) {
  const { rows } = await tx.query('SELECT user_id, locale FROM patients WHERE id = $1', [patientId]);
  if (!rows[0]?.user_id) return false;
  const nl = rows[0].locale !== 'en';
  const title = nl ? `Lees over de ${muscle.nl.toLowerCase()}` : `Read about the ${muscle.en.toLowerCase()}`;
  const body = note || (nl ? 'Je fysiotherapeut wil dat je weet wat deze spier doet en hoe je hem traint.' : 'Your physiotherapist wants you to know what this muscle does and how you train it.');
  await tx.query(
    'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
    [rows[0].user_id, practiceId, 'atlas_muscle', title, body, `/p/spieren?tab=spieren&open=${muscle.key}`],
  );
  return true;
}

/** The therapist asks the patient to measure their mobility (link to the measuring page). */
export async function notifyPatientMeasure(tx: Tx, patientId: string, practiceId: string, note: string) {
  const { rows } = await tx.query('SELECT user_id, locale FROM patients WHERE id = $1', [patientId]);
  if (!rows[0]?.user_id) return false;
  const nl = rows[0].locale !== 'en';
  await tx.query(
    'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
    [
      rows[0].user_id,
      practiceId,
      'mobility_measure',
      nl ? 'Meet je mobiliteit' : 'Measure your mobility',
      note || (nl ? 'Je fysiotherapeut vraagt je om de mobiliteitstests te doen. Het duurt een paar minuten, met een meetlint.' : 'Your physiotherapist asks you to do the mobility tests. It takes a few minutes, with a tape measure.'),
      '/p/mobiliteit/meten',
    ],
  );
  return true;
}

/** Notify assigned therapists that a patient left feedback / completed a session. */
export async function notifyTherapists(tx: Tx, patientId: string, practiceId: string, patientName: string, highPain: boolean) {
  const { rows } = await tx.query('SELECT therapist_id FROM patient_therapists WHERE patient_id = $1', [patientId]);
  for (const r of rows) {
    await tx.query(
      'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        r.therapist_id,
        practiceId,
        'feedback_received',
        highPain ? `Hoge pijnscore gemeld door ${patientName}` : `Nieuwe feedback van ${patientName}`,
        '',
        `/app/patienten/${patientId}`,
      ],
    );
  }
}
