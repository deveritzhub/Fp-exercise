import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { STRENGTH_REGION } from '../src/lib/libraryImport';
import { label } from '../../shared/taxonomy';

/**
 * Writes docs/KLINISCHE_REVIEW.md: exercises whose metadata needs a clinician's check.
 * Read-only: it only lists doubt cases with the reason; it never changes data or decides clinically.
 *   npm run db:review-report
 */
const NORM = (c: string) => `lower(regexp_replace(${c}, '[^[:alnum:]]', '', 'g'))`;

async function main() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_OWNER_URL });
  await db.connect();
  const ex = (
    await db.query(
      `SELECT e.id, e.name_nl, e.name_en, e.body_region, e.equipment, e.target_muscles, e.source_key, e.practice_id,
              e.video_media_id, e.thumbnail_media_id, e.review_status,
              (SELECT count(*) FROM exercise_media_overrides o WHERE o.exercise_id = e.id AND o.video_media_id IS NOT NULL)::int AS own_videos
         FROM exercises e WHERE e.archived_at IS NULL ORDER BY e.name_nl`,
    )
  ).rows;
  const rel = (await db.query(`SELECT exercise_id, kind FROM exercise_relations`)).rows;
  const variants = (
    await db.query(
      `SELECT a.name_nl AS a, a.practice_id IS NULL AS a_central, b.name_nl AS b, b.practice_id IS NULL AS b_central
         FROM exercises a JOIN exercises b ON a.id < b.id AND a.archived_at IS NULL AND b.archived_at IS NULL
          AND (${NORM('a.name_nl')} = ${NORM('b.name_nl')} OR ${NORM('a.name_en')} = ${NORM('b.name_en')})
        ORDER BY a.name_nl`,
    )
  ).rows;
  await db.end();

  const reg = (k: string) => label('region', k, 'nl');
  const src = (r: { practice_id: string | null }) => (r.practice_id ? 'praktijk' : 'centraal');
  const lines: string[] = [];
  const section = (title: string, intro: string, rows: string[]) => {
    lines.push(`## ${title} (${rows.length})`, '', intro, '');
    lines.push(...(rows.length ? rows : ['_Geen._']), '');
  };

  section(
    'Regio niet in de bron, door de import gekozen',
    'De bronbestanden geven voor deze krachtoefeningen geen regio. De import zette ze op een standaardregio (Schouder). Een fysiotherapeut moet de juiste regio kiezen; de app wijzigt dit niet zelf.',
    ex
      .filter((e) => e.source_key?.startsWith('kr_') && !STRENGTH_REGION[e.source_key])
      .map((e) => `- **${e.name_nl}** — nu: ${reg(e.body_region)}; doelspieren: ${e.target_muscles.join(', ') || 'onbekend'}`),
  );
  section(
    'Doelspier past mogelijk niet bij de regio',
    'Signaal op basis van trefwoorden in de doelspieren (biceps/triceps → elleboog, kuit → enkel/voet). Alleen ter controle.',
    ex
      .filter((e) => {
        const m = e.target_muscles.join(' ').toLowerCase();
        return (/biceps|triceps/.test(m) && e.body_region === 'shoulder') || (/kuit|gastrocnemius|soleus/.test(m) && !['ankle_foot', 'knee'].includes(e.body_region));
      })
      .map((e) => `- **${e.name_nl}** — regio ${reg(e.body_region)}, doelspieren: ${e.target_muscles.join(', ')}`),
  );
  section(
    'Neurodynamiek: regio volgens de bron',
    'De bron zet deze zenuwglijders onder Schouder. Controleer of dat de gewenste indeling is (zoekfilter "Schouder").',
    ex.filter((e) => e.source_key?.startsWith('nd_') && e.body_region === 'shoulder').map((e) => `- **${e.name_nl}**`),
  );
  section(
    'Materiaal: optioneel of verplicht?',
    'Opgeslagen als "geen materiaal" plus ander materiaal. De app toont dit als "Geen materiaal nodig (optioneel: …)". Bevestig dat het materiaal echt optioneel is.',
    ex.filter((e) => e.equipment.includes('none') && e.equipment.length > 1).map((e) => `- **${e.name_nl}** — ${e.equipment.filter((x: string) => x !== 'none').map((x: string) => label('equipment', x, 'nl')).join(', ')}`),
  );
  section(
    'Varianten met dezelfde naam',
    'Zelfde Nederlandse of Engelse naam in meerdere records. De app toont ze naast elkaar met verschillen; er wordt niets samengevoegd. Beslis per paar of beide nodig zijn.',
    variants.map((v) => `- ${v.a} (${v.a_central ? 'centraal' : 'praktijk'}) ↔ ${v.b} (${v.b_central ? 'centraal' : 'praktijk'})`),
  );
  section(
    'Geen makkelijkere variant of alternatief vastgelegd',
    'Deze oefeningen hebben wel een progressie maar geen regressie of alternatief. De therapeut moet een vervangende oefening dan zelf kiezen.',
    ex
      .filter((e) => rel.some((r) => r.exercise_id === e.id && r.kind === 'progression') && !rel.some((r) => r.exercise_id === e.id && r.kind !== 'progression'))
      .map((e) => `- **${e.name_nl}** (${src(e)})`),
  );
  const noMedia = ex.filter((e) => !e.video_media_id && !e.own_videos);
  section(
    'Ontbrekende video',
    'Geen video in de bibliotheek en geen praktijkvideo. De patiënt ziet alleen de tekst. Er worden geen voorbeeldvideo’s verzonnen.',
    noMedia.map((e) => `- ${e.name_nl} (${src(e)})${e.thumbnail_media_id ? ' — wel een afbeelding' : ' — ook geen afbeelding'}`),
  );

  const head = [
    '# Klinische reviewlijst',
    '',
    `Gegenereerd op ${new Date().toISOString().slice(0, 10)} met \`npm run db:review-report\` uit de lokale database (${ex.length} oefeningen, ${ex.filter((e) => e.review_status !== 'reviewed').length} nog niet klinisch goedgekeurd).`,
    'Dit is een signaleringslijst: niets hieronder is automatisch gecorrigeerd en geen enkel punt is een klinisch oordeel.',
    '',
  ];
  const out = path.join(import.meta.dirname, '../../docs/KLINISCHE_REVIEW.md');
  fs.writeFileSync(out, [...head, ...lines].join('\n'));
  console.log(`written ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
