import { z } from 'zod';
import { FP_LIBRARY_EN } from '../../db/seed-data/fp-library-en';

/**
 * Imports a practice's own exercise library as practice-owned exercises plus programme templates.
 *
 * Two file formats (Functional Performance):
 * - library file: { oefeningen, programmas }  (revalidatie)
 * - app update:   { seed_data: { revalidatie, krachttraining, mobiliteit } }
 *
 * Both are normalised into one bundle. Phased programmes become one template per phase, linked as a
 * series (series_key) with per-phase goal, weeks, criteria for the next phase (test, threshold,
 * source), red flags and warnings. Progression between phases is never automatic.
 *
 * - Idempotent: rows are matched on the file's ids (`source_key`); a new version updates them.
 * - Runs under the caller's database role: via the API that is the practice admin under RLS.
 * - External ids/links in the file (video_url, physitrack_id) are not used.
 */

// ------------------------------------------------------------------------------------------------
// File schemas
// ------------------------------------------------------------------------------------------------
const num = z.number().int().min(0).max(1000).nullable().optional();
const str = (n: number) => z.string().max(n);
const criterion = z.object({ criterium: str(300), drempel: str(300).optional(), meetmethode: str(200).optional(), bron: str(300).optional() });
const criteriaGroups = z.array(z.object({ van: str(60), naar: str(80), criteria: z.array(criterion).max(30) })).max(12);
const phaseItem = z.object({
  exercise_id: str(80),
  sets: num,
  reps: num,
  hold_sec: num,
  frequentie_per_week: z.number().int().min(1).max(7).optional(),
  opmerking: str(1000).optional(),
});

const rehabExercise = z.object({
  id: z.string().min(1).max(80),
  naam: z.string().min(2).max(160),
  categorie: str(40),
  type_belasting: str(40),
  regio: str(40),
  niveau: str(40).optional(),
  instructie: str(2000),
  dosering: z.object({ sets: num, reps: num, hold_sec: num, tempo: str(80).nullable().optional(), rust_sec: num, intensiteit: str(200).nullable().optional() }).partial(),
  symptoomregel: str(500).optional(),
  tags: z.array(str(60)).max(30).optional(),
  dosis_status: str(300).optional(),
});
const rehabProgram = z.object({
  id: z.string().min(1).max(80),
  naam: z.string().min(2).max(120),
  indicatie: str(500).optional(),
  duur_weken: z.number().int().min(1).max(104).optional(),
  fases: z.array(z.object({ naam: str(60), weken: str(20).optional(), doel: str(500).optional(), oefeningen: z.array(phaseItem).max(40) })).min(1).max(12),
  progressiecriteria: z.array(str(300)).max(30).optional(),
  rode_vlaggen: z.array(str(300)).max(30).optional(),
  aanpassen_aan_protocol: z.boolean().optional(),
  evidentie_status: str(1000).optional(),
  criteria_per_fase: criteriaGroups.optional(),
  criteria_toelichting: str(1000).optional(),
});
const rehabModule = z.object({
  _toelichting: z.object({ symptoomregel_standaard: str(500).optional() }).passthrough().optional(),
  oefeningen: z.array(rehabExercise).min(1).max(1000),
  programmas: z.array(rehabProgram).max(200).default([]),
});

const numOrStr = z.union([str(20), z.number()]);
const strengthModule = z.object({
  _toelichting: z
    .object({ veiligheid: z.object({ screening_vooraf: str(500).optional(), rode_vlaggen_tijdens_training: z.array(str(200)).max(20).optional() }).partial().optional() })
    .passthrough()
    .optional(),
  oefeningen: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        naam: z.string().min(2).max(160),
        categorie: str(40),
        hoofdspier: str(200).optional(),
        materiaal: str(120).optional(),
        niveau: str(40).optional(),
        '1rm_relevant': z.boolean().optional(),
        herhalingen_range: str(40).optional(),
        rust_min: numOrStr.optional(),
        cues: str(1000).optional(),
        tags: z.array(str(60)).max(30).optional(),
      }),
    )
    .max(1000),
  programmas: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        naam: z.string().min(2).max(120),
        niveau: str(80).optional(),
        doel: str(500).optional(),
        geschat_sets_per_week: str(500).optional(),
        dagen: z
          .array(z.object({ dag: str(40), oefeningen: z.array(z.object({ exercise_id: str(80), sets: num, herhalingen: numOrStr.optional(), rust_min: numOrStr.optional(), rpe: numOrStr.optional() })).max(20) }))
          .min(1)
          .max(7),
        opmerking: str(1000).optional(),
        verwijzing: str(500).optional(),
      }),
    )
    .max(100),
  overgang_naar_kracht: z.object({ criteria: z.array(str(300)).max(20), bron: str(500).optional() }).optional(),
});

const mobilityModule = z.object({
  _toelichting: z.object({ dosering_richtlijn: str(1500).optional() }).passthrough().optional(),
  oefeningen: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        naam: z.string().min(2).max(160),
        regio: str(40),
        dosering: str(200).optional(),
        cues: str(1000).optional(),
        tags: z.array(str(60)).max(30).optional(),
        dosis_status: str(300).optional(),
        niveau: str(40).optional(),
      }),
    )
    .max(1000),
  programmas: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        naam: z.string().min(2).max(120),
        doel: str(500).optional(),
        frequentie_per_week: z.number().int().min(1).max(7).optional(),
        oefeningen: z.array(phaseItem).max(40).optional(),
        fases: z.array(z.object({ naam: str(60), weken: str(20).optional(), doel: str(500).optional(), oefeningen: z.array(phaseItem).max(40) })).max(12).optional(),
        criteria_per_fase: criteriaGroups.optional(),
      }),
    )
    .max(100),
});

export const libraryFileSchema = z.union([
  z.object({ seed_data: z.object({ revalidatie: rehabModule.optional(), krachttraining: strengthModule.optional(), mobiliteit: mobilityModule.optional() }) }),
  rehabModule,
]);
export type LibraryFile = z.infer<typeof libraryFileSchema>;

// ------------------------------------------------------------------------------------------------
// Normalised bundle
// ------------------------------------------------------------------------------------------------
type Module = 'revalidatie' | 'kracht' | 'mobiliteit';
type NExercise = {
  key: string; nameNl: string; nameEn: string; region: string; training: string[]; movement: string | null; equipment: string[];
  difficulty: number; muscles: string[]; movementNl: string; movementEn: string; cuesNl: string; cuesEn: string;
  sets: number | null; reps: number | null; holdS: number | null; restS: number | null; tempo: string | null; frequency: string | null;
  tags: string[]; reviewed: boolean; notes: string;
};
type NItem = { ex: string; sets: number | null; reps: number | null; holdS: number | null; restS: number | null; days: number[]; frequency: string | null; notes: string };
export type Criteria = { to: string; title: string; items: { label: string; threshold: string; test: string; source: string }[] }[];
type NTemplate = {
  key: string; module: Module; seriesKey: string | null; seriesTitle: string | null; title: string; indication: string;
  phaseNo: number | null; phaseCount: number | null; phaseName: string | null; phaseWeeks: string | null; phaseGoal: string | null;
  criteria: Criteria; redFlags: string[]; warnings: string[]; evidence: string; description: string; instructions: string; items: NItem[];
};
export type Bundle = { exercises: NExercise[]; templates: NTemplate[] };

const REGION: Record<string, string> = {
  knie: 'knee', heup: 'hip', enkel_voet: 'ankle_foot', enkel: 'ankle_foot', voet: 'ankle_foot', schouder: 'shoulder',
  nek: 'cervical_spine', rug: 'lumbar_spine', core: 'lumbar_spine', elleboog: 'elbow', pols_hand: 'wrist_hand', totaal: 'full_body',
};
const TRAINING: Record<string, string> = {
  isometrisch: 'isometric', concentrisch: 'concentric', excentrisch: 'eccentric', isotoon: 'strength', kracht: 'strength',
  neurodynamisch: 'neurodynamics', neurodynamiek: 'neurodynamics', mobiliteit: 'mobility', stretch: 'mobility',
  balans: 'balance', plyometrisch: 'plyometrics', activatie: 'motor_control',
};
const DAYS: Record<number, number[]> = { 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [1, 2, 3, 4, 5, 6, 7] };
const WEEKDAY_NL = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const firstInt = (s: string | number | undefined | null) => {
  const m = String(s ?? '').match(/\d+/);
  return m ? Number(m[0]) : null;
};
const lastInt = (s: string | number | undefined | null) => {
  const all = String(s ?? '').match(/\d+/g);
  return all ? Number(all[all.length - 1]) : null;
};
const minutesToS = (v: string | number | undefined) => {
  const n = firstInt(v);
  return n ? Math.min(900, n * 60) : null;
};

function equipmentFor(text: string) {
  const s = text.toLowerCase();
  const out = new Set<string>();
  if (/\bband\b/.test(s)) out.add('resistance_band');
  if (/muur|deurpost|deuropening/.test(s)) out.add('wall');
  if (/leg press|platform|machine|smith/.test(s)) out.add('gym_machine');
  if (/step-up|box|trede/.test(s)) out.add('step');
  if (/bankje|bulgarian|\bbank\b/.test(s)) out.add('bench');
  if (/barbell|squatrack/.test(s)) out.add('barbell');
  if (/dumbbell/.test(s)) out.add('dumbbell');
  if (/kabel|cable/.test(s)) out.add('cable');
  if (/optrekstang/.test(s)) out.add('pullup_bar');
  return out.size ? [...out] : ['none'];
}

/** Same exercise in our central library (with an approved demo video): reuse that video. */
const SAME_AS_LIBRARY: Record<string, string> = {
  ex_glute_bridge: 'Bekkenbrug',
  ex_clamshell: 'Schelp met weerstandsband',
  ex_heel_raise_bilateraal: 'Hielheffen staand',
  ex_single_leg_balance: 'Eenbeensstand',
  ex_step_up: 'Opstappen',
  ex_dead_bug: 'Dead bug',
  ex_chin_tuck: 'Kinintrekking',
  ex_cat_camel: 'Kat-koe',
};
/** Mobility exercises that are the same as an exercise of the practice's rehab library: reuse that one. */
const MOBILITY_SAME_AS: Record<string, string> = {
  mb_kniebuiging_muur: 'ex_kniebuiging_muur',
  mb_hip_flexor_stretch: 'ex_hip_flexor_stretch',
  mb_thoracic_rotatie: 'ex_thoracic_rotatie',
  mb_cat_camel: 'ex_cat_camel',
};
const STRENGTH_EN: Record<string, string> = { kr_leg_curl: 'Lying leg curl', kr_standing_calf_raise: 'Standing calf raise', kr_lateral_raise: 'Dumbbell lateral raise' };
const STRENGTH_REGION: Record<string, string> = {
  kr_back_squat: 'knee', kr_leg_press: 'knee', kr_leg_curl: 'knee', kr_leg_extension: 'knee', kr_rdl: 'hip', kr_conventional_deadlift: 'hip',
  kr_hip_thrust: 'hip', kr_standing_calf_raise: 'ankle_foot', kr_core_plank: 'lumbar_spine',
};
const STRENGTH_MOVEMENT: Record<string, string> = { legs: 'squat', push: 'push', pull: 'pull', core: 'core_stability' };
const HINGE = new Set(['kr_rdl', 'kr_conventional_deadlift', 'kr_hip_thrust']);

const criteriaFrom = (groups: z.infer<typeof criteriaGroups> | undefined, from: string): Criteria =>
  (groups ?? [])
    .filter((g) => g.van === from)
    .map((g) => ({
      to: g.naar,
      title: `Criteria voor ${g.naar}`,
      items: g.criteria.map((c) => ({ label: c.criterium, threshold: c.drempel ?? '', test: c.meetmethode ?? '', source: c.bron ?? '' })),
    }));

/** Criteria for one phase; groups that start after the last listed phase (e.g. VKB "Fase 5") go with the last phase. */
function phaseCriteria(groups: z.infer<typeof criteriaGroups> | undefined, phases: { naam: string }[], i: number): Criteria {
  let out = criteriaFrom(groups, phases[i].naam);
  if (i === phases.length - 1) {
    const known = new Set(phases.map((x) => x.naam));
    for (const g of groups ?? []) if (!known.has(g.van)) out = [...out, ...criteriaFrom([g], g.van)];
  }
  return out;
}

function normaliseRehab(m: z.infer<typeof rehabModule>, b: Bundle) {
  for (const e of m.oefeningen) {
    const d = e.dosering ?? {};
    const tempo = d.tempo && d.tempo !== 'n.v.t.' && d.tempo.length <= 20 ? d.tempo : null;
    const longTempo = d.tempo && d.tempo !== 'n.v.t.' && !tempo ? d.tempo : null;
    const t = FP_LIBRARY_EN[e.id];
    b.exercises.push({
      key: e.id,
      nameNl: e.naam,
      nameEn: t?.name ?? e.naam,
      region: e.naam.toLowerCase().includes('thoracale') ? 'thoracic_spine' : REGION[e.regio] ?? 'full_body',
      training: [...new Set([TRAINING[e.type_belasting], TRAINING[e.categorie]].filter(Boolean))] as string[],
      movement: null,
      equipment: equipmentFor(`${e.naam} ${e.instructie}`),
      difficulty: e.niveau === 'gevorderd' ? 4 : 2,
      muscles: [],
      movementNl: e.instructie,
      movementEn: t?.instruction ?? '',
      cuesNl: [e.symptoomregel && `Pijnregel: ${e.symptoomregel}.`, d.intensiteit && `Intensiteit: ${d.intensiteit}.`, longTempo && `Tempo: ${longTempo}.`].filter(Boolean).join(' '),
      cuesEn: t?.rule ? `Pain rule: ${t.rule}.` : '',
      sets: d.sets || null,
      reps: d.reps || null,
      holdS: d.hold_sec || null,
      restS: d.rust_sec ?? null,
      tempo,
      frequency: null,
      tags: [...new Set(e.tags ?? [])],
      reviewed: /^gecheckt/i.test(e.dosis_status ?? ''),
      notes: [e.dosis_status && `Onderbouwing dosering: ${e.dosis_status}.`, d.intensiteit && `Intensiteit: ${d.intensiteit}.`].filter(Boolean).join('\n'),
    });
  }
  const rule = m._toelichting?.symptoomregel_standaard;
  for (const p of m.programmas) {
    const practiceCriteria = /schouder|nek|rug|subacromiaal/i.test(`${p.naam} ${p.id}`) && !/VKB|achilles/i.test(p.naam);
    const warnings = [
      p.aanpassen_aan_protocol && (/VKB/i.test(p.naam) ? 'De fasering volgt het chirurgisch protocol, niet de app.' : 'Pas aan aan het protocol van de patiënt; dat is het bindende kader, niet de app.'),
      practiceCriteria && 'Deze criteria zijn praktijkcriteria. Bevestig ze als fysiotherapeut voordat je ze gebruikt.',
    ].filter(Boolean) as string[];
    p.fases.forEach((f, i) => {
      let criteria = phaseCriteria(p.criteria_per_fase, p.fases, i);
      if (!criteria.length && i === p.fases.length - 1 && p.progressiecriteria?.length) {
        criteria = [{ to: 'Afronding', title: 'Progressiecriteria', items: p.progressiecriteria.map((c) => ({ label: c, threshold: '', test: '', source: '' })) }];
      }
      // Remarks per exercise are clinical ("optional, no proven benefit"): they go into the internal
      // description, not into item notes (which patients see).
      const remarks = f.oefeningen.filter((it) => it.opmerking).map((it) => `• ${m.oefeningen.find((x) => x.id === it.exercise_id)?.naam ?? it.exercise_id}: ${it.opmerking}`);
      b.templates.push({
        key: `${p.id}#${i + 1}`,
        module: 'revalidatie',
        seriesKey: p.id,
        seriesTitle: p.naam,
        title: clip(`${p.naam} — ${f.naam}${f.weken ? ` (wk ${f.weken})` : ''}`, 160),
        indication: p.indicatie ?? '',
        phaseNo: i + 1,
        phaseCount: p.fases.length,
        phaseName: f.naam,
        phaseWeeks: f.weken ?? null,
        phaseGoal: f.doel ?? null,
        criteria,
        redFlags: p.rode_vlaggen ?? [],
        warnings,
        evidence: clip([p.evidentie_status, p.criteria_toelichting].filter(Boolean).join('\n\n'), 2000),
        description: clip(
          [`${f.naam}${f.weken ? ` (week ${f.weken})` : ''}${f.doel ? `: ${f.doel}.` : ''}`, remarks.length && `Per oefening:\n${remarks.join('\n')}`].filter(Boolean).join('\n\n'),
          4000,
        ),
        instructions: [
          rule && `${rule.replace(/\.+$/, '')}.`,
          p.rode_vlaggen?.length && `Stop en neem contact op met je fysiotherapeut bij: ${p.rode_vlaggen.map((r) => r.charAt(0).toLowerCase() + r.slice(1)).join('; ')}.`,
        ].filter(Boolean).join(' '),
        items: f.oefeningen.map((it) => {
          const ex = m.oefeningen.find((x) => x.id === it.exercise_id);
          return {
            ex: it.exercise_id, sets: it.sets || null, reps: it.reps || null, holdS: it.hold_sec || null, restS: ex?.dosering?.rust_sec ?? null,
            days: DAYS[it.frequentie_per_week ?? 7], frequency: it.frequentie_per_week ? `${it.frequentie_per_week}× per week` : null, notes: '',
          };
        }),
      });
    });
  }
}

function normaliseStrength(m: z.infer<typeof strengthModule>, b: Bundle) {
  for (const e of m.oefeningen) {
    const range = e.herhalingen_range ?? '';
    const isTime = /sec/.test(range);
    b.exercises.push({
      key: e.id,
      nameNl: e.naam,
      nameEn: STRENGTH_EN[e.id] ?? e.naam,
      region: STRENGTH_REGION[e.id] ?? 'shoulder',
      training: ['strength'],
      movement: HINGE.has(e.id) ? 'hinge' : STRENGTH_MOVEMENT[e.categorie] ?? null,
      equipment: e.materiaal && e.materiaal !== 'Geen' ? equipmentFor(e.materiaal) : ['none'],
      difficulty: e.niveau === 'gevorderd' ? 4 : e.niveau === 'beginner' ? 2 : 3,
      muscles: (e.hoofdspier ?? '').split(/,\s*/).filter(Boolean),
      movementNl: '',
      movementEn: '',
      cuesNl: [e.cues, range && `Herhalingen: ${range}.`, e.rust_min && `Rust: ${e.rust_min} min.`].filter(Boolean).join(' '),
      cuesEn: '',
      sets: 3,
      reps: isTime ? null : lastInt(range),
      holdS: isTime ? firstInt(range) : null,
      restS: minutesToS(e.rust_min),
      tempo: null,
      frequency: null,
      tags: [...new Set(['krachttraining', ...(e.tags ?? []), ...(e['1rm_relevant'] ? ['1rm'] : [])])],
      reviewed: false,
      notes: e['1rm_relevant'] ? 'Hoofdoefening: geschikt voor 1RM-schatting (Epley/Brzycki) bij sets tot 10 herhalingen.' : '',
    });
  }
  const v = m._toelichting?.veiligheid;
  const entry: Criteria = m.overgang_naar_kracht
    ? [{ to: 'Start krachtmodule', title: 'Voorwaarden om te starten (overgang van revalidatie)', items: m.overgang_naar_kracht.criteria.map((c) => ({ label: c, threshold: '', test: '', source: m.overgang_naar_kracht?.bron ?? '' })) }]
    : [];
  for (const p of m.programmas) {
    const weekdays = p.dagen.length === 3 ? [1, 3, 5] : [1, 2, 3, 4, 5, 6, 7].slice(0, p.dagen.length);
    const lowVolume = /onder de 10/i.test(p.geschat_sets_per_week ?? '');
    const isTime = (h: unknown) => /sec/.test(String(h ?? ''));
    b.templates.push({
      key: p.id,
      module: 'kracht',
      seriesKey: null,
      seriesTitle: null,
      title: p.naam,
      indication: [p.doel, p.niveau && `Niveau: ${p.niveau}.`].filter(Boolean).join(' '),
      phaseNo: null, phaseCount: null, phaseName: null, phaseWeeks: null, phaseGoal: null,
      criteria: entry,
      redFlags: v?.rode_vlaggen_tijdens_training ?? [],
      warnings: [
        lowVolume && `Volume: ${p.geschat_sets_per_week}`,
        v?.screening_vooraf && `Screening vooraf: ${v.screening_vooraf}`,
        'Statisch rekken niet direct vóór de training: gebruik een dynamische warming-up en rek na de training of in een aparte sessie.',
      ].filter(Boolean) as string[],
      evidence: clip([p.geschat_sets_per_week && `Geschat volume: ${p.geschat_sets_per_week}`, p.opmerking, p.verwijzing].filter(Boolean).join('\n\n'), 2000),
      description: p.dagen.map((d, i) => `${WEEKDAY_NL[weekdays[i] - 1]}: ${d.dag}`).join(' · '),
      instructions: [
        'Werk binnen de herhalingenrange. Halen alle sets de bovengrens met goede techniek, dan mag het gewicht omhoog (2,5 tot 5 kg).',
        v?.rode_vlaggen_tijdens_training?.length && `Stop direct en neem contact op bij: ${v.rode_vlaggen_tijdens_training.map((r) => r.toLowerCase()).join('; ')}.`,
      ].filter(Boolean).join(' '),
      // Item notes are seen by the patient: the day, rep range and RPE are exactly what they need.
      items: p.dagen.flatMap((d, i) =>
        d.oefeningen.map((it) => ({
          ex: it.exercise_id,
          sets: it.sets || null,
          reps: isTime(it.herhalingen) ? null : lastInt(it.herhalingen),
          holdS: isTime(it.herhalingen) ? firstInt(it.herhalingen) : null,
          restS: minutesToS(it.rust_min),
          days: [weekdays[i]],
          frequency: null,
          notes: [d.dag, it.herhalingen && `${it.herhalingen} herhalingen`, it.rpe && `RPE ${it.rpe}`].filter(Boolean).join(' · '),
        })),
      ),
    });
  }
}

function normaliseMobility(m: z.infer<typeof mobilityModule>, b: Bundle) {
  const reuse = (id: string) => (MOBILITY_SAME_AS[id] && b.exercises.some((x) => x.key === MOBILITY_SAME_AS[id]) ? MOBILITY_SAME_AS[id] : null);
  for (const e of m.oefeningen) {
    if (reuse(e.id)) continue;
    const dose = e.dosering ?? '';
    const reps = dose.match(/(\d+) (?:herhalingen|wissels)/) ?? dose.match(/(\d+) per kant/) ?? dose.match(/sets van (\d+)\b(?!\s*sec)/);
    b.exercises.push({
      key: e.id,
      nameNl: e.naam,
      nameEn: e.naam,
      region: REGION[e.regio] ?? 'full_body',
      training: ['mobility'],
      movement: 'stretch',
      equipment: equipmentFor(`${e.naam} ${e.cues ?? ''}`),
      difficulty: e.niveau === 'gevorderd' ? 4 : 2,
      muscles: [],
      movementNl: '',
      movementEn: '',
      cuesNl: [e.cues && `${e.cues}.`, dose && `Dosering: ${dose}.`].filter(Boolean).join(' '),
      cuesEn: '',
      sets: firstInt(dose.match(/\d+(?:-\d+)? sets/)?.[0]),
      reps: reps ? Number(reps[1]) : null,
      holdS: firstInt(dose.match(/\d+ sec/)?.[0]),
      restS: null,
      tempo: null,
      frequency: /dagelijks/.test(dose) ? 'dagelijks' : null,
      tags: [...new Set(['mobiliteit', ...(e.tags ?? [])])],
      reviewed: /^gecheckt/i.test(e.dosis_status ?? ''),
      notes: e.dosis_status ? `Onderbouwing dosering: ${e.dosis_status}.` : '',
    });
  }
  const item = (it: z.infer<typeof phaseItem>, perWeek?: number): NItem => {
    const f = it.frequentie_per_week ?? perWeek;
    return {
      ex: reuse(it.exercise_id) ?? it.exercise_id, sets: it.sets || null, reps: it.reps || null, holdS: it.hold_sec || null, restS: null,
      days: DAYS[f ?? 7], frequency: f ? `${f}× per week` : null, notes: it.opmerking ?? '',
    };
  };
  const base = {
    module: 'mobiliteit' as const,
    redFlags: [] as string[],
    warnings: ['Statisch rekken niet direct vóór krachttraining: dan een dynamische warming-up, statisch rekken na de training of in een aparte sessie.'],
    evidence: clip(m._toelichting?.dosering_richtlijn ?? '', 2000),
    instructions: 'Rek tot een lichte spanning, niet tot pijn. Houd rustig vast en adem door.',
  };
  for (const p of m.programmas) {
    if (p.fases?.length) {
      const phases = p.fases;
      phases.forEach((f, i) =>
        b.templates.push({
          ...base,
          key: `${p.id}#${i + 1}`,
          seriesKey: p.id,
          seriesTitle: p.naam,
          title: clip(`${p.naam} — ${f.naam}${f.weken ? ` (wk ${f.weken})` : ''}`, 160),
          indication: p.doel ?? '',
          phaseNo: i + 1, phaseCount: phases.length, phaseName: f.naam, phaseWeeks: f.weken ?? null, phaseGoal: f.doel ?? null,
          criteria: phaseCriteria(p.criteria_per_fase, phases, i),
          description: `${f.naam}${f.weken ? ` (week ${f.weken})` : ''}${f.doel ? `: ${f.doel}.` : ''}`,
          items: f.oefeningen.map((it) => item(it, p.frequentie_per_week)),
        }),
      );
    } else {
      b.templates.push({
        ...base,
        key: p.id, seriesKey: null, seriesTitle: null, title: p.naam, indication: p.doel ?? '',
        phaseNo: null, phaseCount: null, phaseName: null, phaseWeeks: null, phaseGoal: null,
        criteria: [],
        description: p.doel ?? '',
        items: (p.oefeningen ?? []).map((it) => item(it, p.frequentie_per_week)),
      });
    }
  }
}

export function toBundle(file: LibraryFile): Bundle {
  const b: Bundle = { exercises: [], templates: [] };
  if ('seed_data' in file) {
    if (file.seed_data.revalidatie) normaliseRehab(file.seed_data.revalidatie, b);
    if (file.seed_data.krachttraining) normaliseStrength(file.seed_data.krachttraining, b);
    if (file.seed_data.mobiliteit) normaliseMobility(file.seed_data.mobiliteit, b);
  } else normaliseRehab(file, b);
  return b;
}

// ------------------------------------------------------------------------------------------------
// Database
// ------------------------------------------------------------------------------------------------
type Db = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }> };

export async function importLibrary(db: Db, practiceId: string, userId: string | null, file: LibraryFile) {
  const bundle = toBundle(file);
  const ids: Record<string, string> = {};
  let created = 0;
  let updated = 0;
  for (const e of bundle.exercises) {
    const video = SAME_AS_LIBRARY[e.key]
      ? (await db.query('SELECT video_media_id FROM exercises WHERE practice_id IS NULL AND name_nl = $1 AND video_media_id IS NOT NULL', [SAME_AS_LIBRARY[e.key]])).rows[0]?.video_media_id ?? null
      : null;
    const r = await db.query(
      `INSERT INTO exercises(practice_id, created_by, source_key, name_nl, name_en, body_region, training_categories, movement_category, equipment,
         difficulty, target_muscles, movement_nl, movement_en, instructions_nl, instructions_en, default_sets, default_reps, default_hold_s,
         default_rest_s, default_tempo, default_frequency, tags, review_status, video_media_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (practice_id, source_key) WHERE source_key IS NOT NULL DO UPDATE SET
         name_nl = EXCLUDED.name_nl, name_en = EXCLUDED.name_en, body_region = EXCLUDED.body_region,
         training_categories = EXCLUDED.training_categories, movement_category = EXCLUDED.movement_category, equipment = EXCLUDED.equipment,
         difficulty = EXCLUDED.difficulty, target_muscles = EXCLUDED.target_muscles, movement_nl = EXCLUDED.movement_nl, movement_en = EXCLUDED.movement_en,
         instructions_nl = EXCLUDED.instructions_nl, instructions_en = EXCLUDED.instructions_en, default_sets = EXCLUDED.default_sets,
         default_reps = EXCLUDED.default_reps, default_hold_s = EXCLUDED.default_hold_s, default_rest_s = EXCLUDED.default_rest_s,
         default_tempo = EXCLUDED.default_tempo, default_frequency = EXCLUDED.default_frequency, tags = EXCLUDED.tags,
         video_media_id = coalesce(exercises.video_media_id, EXCLUDED.video_media_id), archived_at = NULL, updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        practiceId, userId, e.key, e.nameNl, e.nameEn, e.region, e.training, e.movement, e.equipment, e.difficulty, e.muscles,
        e.movementNl, e.movementEn, e.cuesNl, e.cuesEn, e.sets, e.reps, e.holdS, e.restS, e.tempo, e.frequency, e.tags,
        e.reviewed ? 'reviewed' : 'needs_clinical_review', video,
      ],
    );
    ids[e.key] = r.rows[0].id;
    if (r.rows[0].inserted) created++;
    else updated++;
    await db.query(
      `INSERT INTO exercise_clinical_notes(exercise_id, practice_id, notes) VALUES ($1,$2,$3)
       ON CONFLICT (exercise_id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now()`,
      [ids[e.key], practiceId, e.notes],
    );
  }
  // Exercises a template uses but this file does not contain (e.g. imported earlier from another file).
  const missing = [...new Set(bundle.templates.flatMap((tp) => tp.items.map((i) => i.ex)))].filter((k) => !ids[k]);
  if (missing.length) {
    const { rows } = await db.query('SELECT id, source_key FROM exercises WHERE practice_id = $1 AND source_key = ANY($2)', [practiceId, missing]);
    for (const r of rows) ids[r.source_key] = r.id;
  }

  for (const tp of bundle.templates) {
    const r = await db.query(
      `INSERT INTO programs(practice_id, is_template, source_key, title, description, patient_instructions, status, created_by,
         module, series_key, series_title, indication, phase_no, phase_count, phase_name, phase_weeks, phase_goal, criteria, red_flags, warnings, evidence)
       VALUES ($1, true, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (practice_id, source_key) WHERE source_key IS NOT NULL AND is_template DO UPDATE SET
         title = EXCLUDED.title, description = EXCLUDED.description, patient_instructions = EXCLUDED.patient_instructions, status = 'active',
         module = EXCLUDED.module, series_key = EXCLUDED.series_key, series_title = EXCLUDED.series_title, indication = EXCLUDED.indication,
         phase_no = EXCLUDED.phase_no, phase_count = EXCLUDED.phase_count, phase_name = EXCLUDED.phase_name, phase_weeks = EXCLUDED.phase_weeks,
         phase_goal = EXCLUDED.phase_goal, criteria = EXCLUDED.criteria, red_flags = EXCLUDED.red_flags, warnings = EXCLUDED.warnings,
         evidence = EXCLUDED.evidence, updated_at = now()
       RETURNING id`,
      [
        practiceId, tp.key, tp.title, clip(tp.description, 4000), tp.instructions, userId, tp.module, tp.seriesKey, tp.seriesTitle,
        clip(tp.indication, 500), tp.phaseNo, tp.phaseCount, tp.phaseName, tp.phaseWeeks, tp.phaseGoal,
        JSON.stringify(tp.criteria), JSON.stringify(tp.redFlags), JSON.stringify(tp.warnings), tp.evidence,
      ],
    );
    const programId = r.rows[0].id;
    await db.query('DELETE FROM program_items WHERE program_id = $1', [programId]);
    for (const [pos, it] of tp.items.entries()) {
      const exId = ids[it.ex];
      if (!exId) continue;
      await db.query(
        `INSERT INTO program_items(program_id, practice_id, exercise_id, position, sets, reps, hold_s, rest_s, frequency, days, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [programId, practiceId, exId, pos, it.sets, it.reps, it.holdS, it.restS, it.frequency, it.days, it.notes.slice(0, 2000)],
      );
    }
  }
  return { exercises: bundle.exercises.length, created, updated, templates: bundle.templates.length };
}

/** Fills in library videos for imported exercises that are the same as one in our own library. */
export async function linkSharedVideos(db: Db) {
  let n = 0;
  for (const [key, name] of Object.entries(SAME_AS_LIBRARY)) {
    const r = await db.query(
      `UPDATE exercises e SET video_media_id = g.video_media_id
         FROM exercises g
        WHERE e.source_key = $1 AND e.practice_id IS NOT NULL AND e.video_media_id IS NULL
          AND g.practice_id IS NULL AND g.name_nl = $2 AND g.video_media_id IS NOT NULL`,
      [key, name],
    );
    n += r.rowCount ?? 0;
  }
  return n;
}
