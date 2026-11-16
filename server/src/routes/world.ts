import { Hono } from 'hono';
import { isClinical } from '../../../shared/accountKind';
import { itemsForDate } from '../../../shared/schedule';
import { buildWorld, publicGuildRaid, sealZone, type GuildCounts, type PhaseTemplate, type WorldProgram, type WorldZone } from '../../../shared/worldMap';
import { skillsForExercise } from '../../../shared/hero';
import { withUser, type Tx } from '../db';
import { requirePatient, requireStaff, type AppEnv } from '../middleware';
import { loadItems } from './programs';
import { publicBosses, heirloomView } from '../lib/boss';
import { ACL_SERIES_KEY, aclPhase } from '../../../shared/aclRoute';

/**
 * World map for the patient, and the practice guild raid for the patient and for staff.
 * Phase status comes only from the programme the therapist released. Counts are aggregates.
 */
export const worldPatient = new Hono<AppEnv>();
export const worldStaff = new Hono<AppEnv>();

async function guildCounts(tx: Tx, practiceId: string): Promise<GuildCounts> {
  const { rows } = await tx.query(
    `SELECT cohort, workouts, mine
       FROM app.practice_guild_week($1, date_trunc('week', now() AT TIME ZONE 'Europe/Amsterdam')::date)`,
    [practiceId],
  );
  const row = rows[0] ?? { cohort: 0, workouts: 0, mine: 0 };
  return { cohort: Number(row.cohort) || 0, workouts: Number(row.workouts) || 0, mine: Number(row.mine) || 0 };
}

worldStaff.get('/guild', async (c) => {
  const { user, practiceId } = requireStaff(c);
  const guild = await withUser(user.id, (tx) => guildCounts(tx, practiceId));
  return c.json(publicGuildRaid(guild, 'staff'));
});

worldPatient.get('/world', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const today = (await tx.query("SELECT to_char(now() AT TIME ZONE 'Europe/Amsterdam', 'YYYY-MM-DD') AS d")).rows[0].d as string;
      const { rows } = await tx.query(
        `SELECT p.id, p.title, p.status, p.module, p.series_key, p.phase_no, p.phase_name, p.phase_weeks, p.phase_goal,
                to_char(p.start_date, 'YYYY-MM-DD') AS start_on,
                to_char((p.activated_at AT TIME ZONE 'Europe/Amsterdam')::date, 'YYYY-MM-DD') AS released_on,
                to_char(p.end_date, 'YYYY-MM-DD') AS end_on,
                (SELECT count(*)::int FROM workout_sessions s
                  WHERE s.program_id = p.id AND s.patient_id = p.patient_id AND s.completed_at IS NOT NULL) AS nodes,
                coalesce(p.map_region, (SELECT e.body_region FROM program_items i JOIN exercises e ON e.id = i.exercise_id
                  WHERE i.program_id = p.id GROUP BY e.body_region ORDER BY count(*) DESC, e.body_region LIMIT 1)) AS region
           FROM programs p
          WHERE p.patient_id = $1 AND NOT p.is_template AND p.status IN ('active', 'completed')`,
        [patient.id],
      );
      const programs: WorldProgram[] = rows.map((r) => ({
        id: r.id as string,
        title: r.title as string,
        status: r.status as 'active' | 'completed',
        module: r.module as string,
        seriesKey: (r.series_key as string | null) ?? null,
        phaseNo: r.phase_no == null ? null : Number(r.phase_no),
        phaseName: (r.phase_name as string | null) ?? null,
        phaseWeeks: (r.phase_weeks as string | null) ?? null,
        phaseGoal: (r.phase_goal as string | null) ?? null,
        nodes: Number(r.nodes) || 0,
        region: (r.region as string | null) ?? null,
      }));
      const primary = programs.find((p) => p.status === 'active' && p.seriesKey && p.phaseNo != null)
        ?? programs.find((p) => p.status === 'active');
      let phaseTemplates: PhaseTemplate[] = [];
      let seriesRegion: string | null = null;
      if (primary?.seriesKey && primary.phaseNo != null) {
        phaseTemplates = (await tx.query('SELECT * FROM app.patient_series_phases($1)', [primary.seriesKey])).rows.map((r) => ({
          no: Number(r.phase_no),
          name: (r.phase_name as string | null) ?? null,
          weeks: (r.phase_weeks as string | null) ?? null,
          goal: (r.phase_goal as string | null) ?? null,
        }));
        const region = await tx.query(
          `SELECT coalesce(p.map_region, e.body_region) AS body_region
             FROM programs p
             LEFT JOIN program_items i ON i.program_id = p.id
             LEFT JOIN exercises e ON e.id = i.exercise_id
            WHERE p.patient_id = $1 AND p.series_key = $2 AND NOT p.is_template
            GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1`,
          [patient.id, primary.seriesKey],
        );
        seriesRegion = (region.rows[0]?.body_region as string | undefined) ?? null;
      }
      const paused = new Set(
        (await tx.query('SELECT DISTINCT program_id FROM red_flag_reports WHERE patient_id = $1 AND handled_at IS NULL', [patient.id])).rows.map((r) => r.program_id as string),
      );
      let scheduledToday = 0;
      for (const row of rows) {
        if (row.status !== 'active' || paused.has(row.id)) continue;
        const items = await loadItems(tx, row.id);
        scheduledToday += itemsForDate(
          { startDate: row.start_on as string | null, endDate: row.end_on as string | null },
          items,
          today,
        ).length;
      }
      const reported = await tx.query(
        `SELECT
           EXISTS (SELECT 1 FROM daily_checkins WHERE patient_id = $1 AND day = $2::date AND score > 0)
           OR EXISTS (SELECT 1 FROM pain_map_entries WHERE patient_id = $1 AND score > 0 AND (recorded_at AT TIME ZONE 'Europe/Amsterdam')::date = $2::date)
           OR EXISTS (SELECT 1 FROM exercise_logs WHERE patient_id = $1 AND pain > 0 AND (created_at AT TIME ZONE 'Europe/Amsterdam')::date = $2::date)
           OR EXISTS (SELECT 1 FROM workout_sessions WHERE patient_id = $1 AND pain > 0 AND (completed_at AT TIME ZONE 'Europe/Amsterdam')::date = $2::date)
           OR EXISTS (SELECT 1 FROM self_trainings WHERE patient_id = $1 AND day = $2::date AND (stopped_for_pain OR coalesce(pain, 0) > 0))
           AS reported`,
        [patient.id, today],
      );
      const guild = await guildCounts(tx, patient.practiceId);
      const world = buildWorld({
        clinical: isClinical(patient.kind),
        programs,
        phaseTemplates,
        seriesRegion,
        scheduledToday,
        reportedPain: !!reported.rows[0]?.reported,
        guild,
      });
      const seriesKey = primary?.seriesKey && primary.phaseNo != null ? primary.seriesKey : null;
      for (const zone of world.zones) {
        if (zone.locked) continue;
        const mine = rows.filter((r) => (seriesKey ? r.series_key === seriesKey && Number(r.phase_no) === zone.no : r.id === zone.programId));
        const ids = mine.map((r) => r.id as string);
        const first = (key: string) => mine.map((r) => r[key] as string | null).filter(Boolean).sort()[0] ?? null;
        const last = (key: string) => mine.map((r) => r[key] as string | null).filter(Boolean).sort().at(-1) ?? null;
        zone.releasedOn = first('released_on');
        zone.startedOn = first('start_on') ?? zone.releasedOn;
        zone.endedOn = zone.status === 'done' ? last('end_on') : null;
        if (ids.length) {
          const dates = await tx.query(
            `SELECT to_char((completed_at AT TIME ZONE 'Europe/Amsterdam')::date, 'YYYY-MM-DD') AS d
               FROM workout_sessions
              WHERE patient_id = $1 AND program_id = ANY($2::uuid[]) AND completed_at IS NOT NULL
              ORDER BY completed_at`,
            [patient.id, ids],
          );
          zone.workoutDates = dates.rows.map((r) => r.d as string);
          const itemProgram = zone.programId && ids.includes(zone.programId) ? zone.programId : ids[0];
          const items = await loadItems(tx, itemProgram);
          zone.exercises = items.map((item) => ({ itemId: item.id as string, programId: itemProgram, nameNl: item.exercise.nameNl as string, nameEn: item.exercise.nameEn as string }));
          const skills = new Set<string>();
          for (const item of items) {
            for (const skill of skillsForExercise(item.exercise.trainingCategories ?? [], item.exercise.movementCategory ?? null)) skills.add(skill);
          }
          zone.skills = [...skills];
        }
      }
      if (seriesKey) {
        const names = await tx.query(
          `SELECT phase_no, phase_name FROM programs
            WHERE patient_id = $1 AND series_key = $2 AND NOT is_template AND phase_name IS NOT NULL`,
          [patient.id, seriesKey],
        );
        for (const zone of world.zones) {
          const named = names.rows.find((r) => Number(r.phase_no) === zone.no);
          if (named?.phase_name) zone.name = named.phase_name as string;
        }
      }
      world.zones = world.zones.map(sealZone);
      const bosses = await publicBosses(tx, patient.id);
      const acl = seriesKey === ACL_SERIES_KEY;
      for (const zone of world.zones) {
        const named = acl ? aclPhase(zone.no) : null;
        const row = zone as WorldZone & { measure?: unknown; bossNameNl?: string | null; bossNameEn?: string | null };
        row.bossNameNl = named?.bossNl ?? null;
        row.bossNameEn = named?.bossEn ?? null;
        const hit = bosses.find((b) => b.programId === zone.programId);
        row.measure = zone.locked || !hit ? null : {
          labelNl: hit.labelNl, labelEn: hit.labelEn, unit: hit.unit, remaining: hit.remaining, latest: hit.latest, ratio: hit.ratio, defeated: hit.defeated,
          lines: hit.lines,
        };
      }
      return { ...world, heirloom: await heirloomView(tx, patient.id) };
    }),
  );
});
