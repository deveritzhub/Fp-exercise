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
