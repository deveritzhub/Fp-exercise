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
  /** A short personal message from the therapist ("Goed bezig, we gaan zwaarder!"), shown under the text. */
  message = '',
) {
  const { rows } = await tx.query('SELECT user_id, locale FROM patients WHERE id = $1', [patientId]);
  if (!rows[0]?.user_id) return;
  const msg = TEXT[kind][rows[0].locale as 'nl' | 'en'](programTitle);
  const body = message ? `${msg.body}\n\n“${message}”` : msg.body;
  await tx.query(
    'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
    [rows[0].user_id, practiceId, kind, msg.title, body, '/p'],
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

/** The therapist sends the plain-language explanation of a complaint (opens it in the patient app). */
export async function notifyPatientComplaint(tx: Tx, patientId: string, practiceId: string, complaint: { key: string; name: readonly [string, string] }, note: string) {
  const { rows } = await tx.query('SELECT user_id, locale FROM patients WHERE id = $1', [patientId]);
  if (!rows[0]?.user_id) return false;
  const nl = rows[0].locale !== 'en';
  await tx.query(
    'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
    [
      rows[0].user_id,
      practiceId,
      'complaint_explanation',
      nl ? `Uitleg: ${complaint.name[0]}` : `Explanation: ${complaint.name[1]}`,
      note || (nl ? 'Je fysiotherapeut stuurt je uitleg over je klacht en waarom je deze oefeningen doet.' : 'Your physiotherapist sends you an explanation of your complaint and why you do these exercises.'),
      `/p/uitleg?klacht=${complaint.key}`,
    ],
  );
  return true;
}

/**
 * A new rehabilitation phase was released by the therapist (a phased programme with phase 2 or later
 * became active): "Chapter 1 completed", with the new phase and goal. Only the therapist releases a phase.
 */
export async function notifyPhaseUnlocked(tx: Tx, programId: string) {
  const p = (await tx.query(
    `SELECT pr.patient_id, pr.practice_id, pr.phase_no, pr.phase_name, pr.phase_goal, pr.series_title, pt.user_id, pt.locale
       FROM programs pr JOIN patients pt ON pt.id = pr.patient_id
      WHERE pr.id = $1 AND pr.status = 'active' AND pr.series_key IS NOT NULL AND pr.phase_no > 1`,
    [programId],
  )).rows[0];
  if (!p?.user_id) return false;
  const nl = p.locale !== 'en';
  const done = p.phase_no - 1;
  const title = nl ? `Hoofdstuk ${done} voltooid!` : `Chapter ${done} completed!`;
  const name = p.phase_name ? `: ${p.phase_name}` : '';
  const body = nl
    ? `Je fysiotherapeut heeft fase ${p.phase_no}${name} vrijgegeven.${p.phase_goal ? ` Nieuw doel: ${p.phase_goal}` : ''}`
    : `Your physiotherapist has released phase ${p.phase_no}${name}.${p.phase_goal ? ` New goal: ${p.phase_goal}` : ''}`;
  await tx.query(
    'INSERT INTO notifications(user_id, practice_id, kind, title, body, link) VALUES ($1,$2,$3,$4,$5,$6)',
    [p.user_id, p.practice_id, 'phase_unlocked', title, body.slice(0, 600), '/p/revalidatie'],
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
