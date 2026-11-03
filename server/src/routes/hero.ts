import { teamWeekSummary } from '../../../shared/teamQuest';
import { Hono } from 'hono';
import { config } from '../config';
import { z } from 'zod';
import { randomInt, randomUUID } from 'node:crypto';
import { withUser, type Tx } from '../db';
import { rateLimit, requirePatient, requireStaff, type AppEnv } from '../middleware';
import { parse, uuidParam } from '../lib/validate';
import { HttpError, badRequest, notFound } from '../lib/errors';
import { loadAdherenceInputs, weeklyForPatient } from '../lib/progress';
import { loadPatientLogs } from '../lib/patientLogs';
import { weeklyAdherence } from '../../../shared/adherence';
import {
  AREA_KEYS, BADGES, CHECKIN_XP, CHEST_XP, GEAR, GEAR_KEYS, onePerSlot, coinsEarned, gearScore, dayChestCoins, chestStreak, longestDayRun, skillTrophies, SHOWCASE_MAX, WALL_BADGES_MAX, seasons, seasonMonth, seasonOf, SEASON_GOAL, SEASON_XP, GENERAL_AREA, HERO_OPTIONS, METRICS, QUEST_XP, averagePain, friendSkillCard, levelFor, questTimeline,
  questXp, skillOfWeek, skillsForExercise, weeklyQuests, weeklyBoss, BOSS_XP, xpFor, type SkillKey, type WeekData,
} from '../../../shared/hero';
import { loadSkillSnapshot } from '../lib/skillState';

/**
 * Sports hero (gamified revalidatie): the patient's own character, a body map with self-reported
 * pain, and XP/levels/badges computed from what the patient actually did. See shared/hero.ts.
 */
export const heroPatient = new Hono<AppEnv>();
export const heroStaff = new Hono<AppEnv>();

const round1 = (n: number) => Math.round(n * 10) / 10;
const metric = (min: number, max: number) => z.number().min(min).max(max).transform(round1).nullable();
const metricsBody = z.object({
  weightKg: metric(METRICS.weightKg.min, METRICS.weightKg.max),
  bodyFatPct: metric(METRICS.bodyFatPct.min, METRICS.bodyFatPct.max),
  heightCm: metric(METRICS.heightCm.min, METRICS.heightCm.max),
});

const look = z.object({
  heroName: z.string().trim().min(1).max(40),
  frame: z.enum(HERO_OPTIONS.frame),
  build: z.enum(HERO_OPTIONS.build),
  skin: z.enum(HERO_OPTIONS.skin),
  hair: z.enum(HERO_OPTIONS.hair),
  hairColor: z.enum(HERO_OPTIONS.hairColor),
  eyeColor: z.enum(HERO_OPTIONS.eyeColor),
  beard: z.enum(HERO_OPTIONS.beard),
  glasses: z.enum(HERO_OPTIONS.glasses),
  outfit: z.enum(HERO_OPTIONS.outfit),
  sport: z.enum(HERO_OPTIONS.sport),
  /** Every sport the patient does; the first is the main one. Optional for older clients. */
  sports: z.array(z.enum(HERO_OPTIONS.sport)).min(1).max(10).optional(),
  /** Play as a guest hero (HERO_GUESTS), or null for the own hero. */
  photoKey: z.string().max(40).nullable().optional(),
});

const mapHero = (r: Record<string, any> | undefined) =>
  r
    ? {
        heroName: r.hero_name, frame: r.frame, build: r.build, skin: r.skin, hair: r.hair, hairColor: r.hair_color, eyeColor: r.eye_color,
        beard: r.beard, glasses: r.glasses, outfit: r.outfit, sport: r.sport, sports: (r.sports?.length ? r.sports : [r.sport]) as string[], photoKey: (r.photo_key ?? null) as string | null, gear: (r.gear ?? []) as string[], createdAt: r.created_at,
      }
    : null;

/** First (baseline) and latest check-in of the body map, each as { recordedAt, entries }. */
async function painMap(tx: Tx, patientId: string) {
  const { rows } = await tx.query(
    `WITH b AS (SELECT batch, min(recorded_at) AS at FROM pain_map_entries WHERE patient_id = $1 GROUP BY batch)
     SELECT b.batch, b.at, e.area, e.score,
            b.at = (SELECT min(at) FROM b) AS is_first, b.at = (SELECT max(at) FROM b) AS is_last
       FROM b JOIN pain_map_entries e ON e.batch = b.batch
      WHERE b.at IN ((SELECT min(at) FROM b), (SELECT max(at) FROM b))
      ORDER BY b.at, e.area`,
    [patientId],
  );
  // A check-in without any sore area is stored as one row with area 'none'.
  const pick = (flag: 'is_first' | 'is_last') => {
    const r = rows.filter((x) => x[flag]);
    if (!r.length) return null;
    return { recordedAt: r[0].at, entries: r.filter((x) => x.area !== 'none').map((x) => ({ area: x.area as string, score: x.score as number })) };
  };
  const baseline = pick('is_first');
  const current = pick('is_last');
  const checkins = (await tx.query('SELECT count(DISTINCT batch)::int AS n FROM pain_map_entries WHERE patient_id = $1', [patientId])).rows[0].n as number;
  return { baseline, current, checkins };
}

async function heroState(tx: Tx, patientId: string) {
  const heroRow = (await tx.query('SELECT * FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0];
  const hero = mapHero(heroRow);
  const map = await painMap(tx, patientId);
  const s = (
    await tx.query(
      `SELECT
         (SELECT count(*)::int FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL) AS sessions,
         (SELECT count(*)::int FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL AND pain IS NOT NULL) AS with_pain,
         (SELECT count(*)::int FROM red_flag_reports WHERE patient_id = $1) AS red_flags,
         (SELECT count(DISTINCT date_trunc('week', recorded_at))::int FROM pain_map_entries WHERE patient_id = $1) AS checkin_weeks,
         (SELECT count(*)::int FROM programs WHERE patient_id = $1 AND status = 'completed' AND phase_no IS NOT NULL) AS phases_done,
         (SELECT count(*)::int FROM strength_sets WHERE patient_id = $1) AS strength_sets,
         (SELECT count(*)::int FROM workout_sessions w JOIN programs p ON p.id = w.program_id
            WHERE w.patient_id = $1 AND w.completed_at IS NOT NULL AND p.module = 'mobiliteit') AS mobility_sessions`,
      [patientId],
    )
  ).rows[0];
  const inputs = await loadAdherenceInputs(tx, [patientId]);
  const weekly = weeklyForPatient(inputs, patientId, 52);
  const fullWeeks = weekly.filter((w) => w.planned > 0 && w.completed >= w.planned).length;
  const daily = (await tx.query('SELECT day::text AS day, area, score FROM daily_checkins WHERE patient_id = $1 ORDER BY day', [patientId])).rows as { day: string; area: string; score: number }[];
  const painBaseline = map.baseline ? averagePain(map.baseline.entries.map((e) => e.score)) ?? 0 : null;
  const painNow = map.current ? averagePain(map.current.entries.map((e) => e.score)) ?? 0 : null;
  // Own workouts, protein and steps (logbook) add skill XP on top of the programme XP.
  const logged = await loadPatientLogs(tx, patientId);
  const skillsSnap = await loadSkillSnapshot(tx, patientId, weekly, logged.skillXp);
  // Warning-sign XP is part of physiotherapy. Coach and personal accounts do not earn it.
  let xp = xpFor({
    sessions: s.sessions,
    sessionsWithPain: s.with_pain,
    redFlags: skillsSnap.accountKind === 'physio' ? s.red_flags : 0,
    checkinWeeks: s.checkin_weeks,
  }) + daily.length * CHECKIN_XP;
  const badgeInput = { sessions: s.sessions, sessionsWithPain: s.with_pain, redFlags: s.red_flags, fullWeeks, phasesCompleted: s.phases_done, painBaseline, painNow };
  // Current chapter: the active rehabilitation programme with a phase.
  const skills = skillsSnap.skills;

  // ---- Weekly quests: evaluated for every week with activity, so XP for past weeks stays. ----
  const perWeek = (
    await tx.query(
      `SELECT to_char(date_trunc('week', l.created_at), 'YYYY-MM-DD') AS week, e.training_categories, e.movement_category, count(*)::int AS n
         FROM exercise_logs l JOIN exercises e ON e.id = l.exercise_id
        WHERE l.patient_id = $1 AND l.completed GROUP BY 1, 2, 3`,
      [patientId],
    )
  ).rows;
  const checkinWeeks = (
    await tx.query(
      `SELECT week, count(*)::int AS n FROM (
         SELECT DISTINCT to_char(date_trunc('week', recorded_at), 'YYYY-MM-DD') AS week, batch::text AS k FROM pain_map_entries WHERE patient_id = $1
         UNION ALL SELECT to_char(date_trunc('week', day::timestamptz), 'YYYY-MM-DD'), day::text FROM daily_checkins WHERE patient_id = $1) x
       GROUP BY week`,
      [patientId],
    )
  ).rows;
  const progSkills = (
    await tx.query(
      `SELECT DISTINCT e.training_categories, e.movement_category FROM program_items i
         JOIN programs p ON p.id = i.program_id JOIN exercises e ON e.id = i.exercise_id
        WHERE p.patient_id = $1 AND p.status = 'active'`,
      [patientId],
    )
  ).rows.flatMap((r) => skillsForExercise(r.training_categories ?? [], r.movement_category));
  const rotation = [...new Set(progSkills)] as SkillKey[];
  const weekData = (weekStart: string): WeekData => {
    const w = weekly.find((x) => x.weekStart === weekStart);
    const skillLogs: Partial<Record<SkillKey, number>> = {};
    for (const r of perWeek.filter((x) => x.week === weekStart))
      for (const k of skillsForExercise(r.training_categories ?? [], r.movement_category)) skillLogs[k] = (skillLogs[k] ?? 0) + r.n;
    return { planned: w?.planned ?? 0, trainedDays: w?.completed ?? 0, checkins: checkinWeeks.find((x) => x.week === weekStart)?.n ?? 0, skillLogs };
  };
  const activeWeeks = new Set([...perWeek.map((r) => r.week as string), ...checkinWeeks.map((r) => r.week as string)]);
  let chestWeeks = 0;
  let bossesDefeated = 0;
  // Per week whether its boss fell, for the monthly seasons.
  const bossWeeks: { weekStart: string; bossDefeated: boolean }[] = [];
  for (const w of weekly.slice(0, -1)) {
    if (!activeWeeks.has(w.weekStart)) continue;
    const wd = weekData(w.weekStart);
    const q = weeklyQuests(wd, skillOfWeek(w.weekStart, rotation));
    xp += questXp(q);
    if (q.every((x) => x.done)) chestWeeks++;
    const fell = weeklyBoss(w.weekStart, wd).defeated;
    bossWeeks.push({ weekStart: w.weekStart, bossDefeated: fell });
    if (fell) {
      xp += BOSS_XP;
      bossesDefeated++;
    }
  }
  const thisWeek = weekly[weekly.length - 1].weekStart;
  // This week's training goal uses all days planned this week (not only those up to today), so it does not grow mid-week.
  const sunday = new Date(thisWeek + 'T12:00:00');
  sunday.setDate(sunday.getDate() + 6);
  const fullWeek = weeklyAdherence(inputs.schedules.get(patientId) ?? [], inputs.done.get(patientId) ?? new Map(), sunday, 1)[0];
  const quests = weeklyQuests({ ...weekData(thisWeek), planned: fullWeek.planned }, skillOfWeek(thisWeek, rotation));
  xp += questXp(quests);
  if (quests.every((x) => x.done)) chestWeeks++;
  // This week's boss, on the same numbers as the quests.
  const boss = weeklyBoss(thisWeek, { ...weekData(thisWeek), planned: fullWeek.planned });
  if (boss.defeated) {
    xp += BOSS_XP;
    bossesDefeated++;
  }
  bossWeeks.push({ weekStart: thisWeek, bossDefeated: boss.defeated });
  // Team quest: my own weekly goal is done, or this week asks nothing (rest) or there is an open
  // medical stop. Only this yes/no ever reaches the team, as part of a group count.
  const medicalHold = (await tx.query('SELECT 1 FROM red_flag_reports WHERE patient_id = $1 AND handled_at IS NULL LIMIT 1', [patientId])).rows.length > 0;
  const teamDone = fullWeek.planned === 0 || medicalHold || !!quests.find((x) => x.key === 'train')?.done;
  // Monthly seasons: three weekly bosses in a month beat the season boss (XP and a trophy).
  const seasonList = seasons(bossWeeks);
  const seasonsWon = seasonList.filter((x) => x.won).length;
  xp += seasonsWon * SEASON_XP;
  const thisMonth = seasonMonth(thisWeek);
  const season = seasonList.find((x) => x.month === thisMonth) ?? { month: thisMonth, key: seasonOf(thisMonth).key, weeks: 1, bossesBeaten: 0, goal: SEASON_GOAL, won: false };
  xp += logged.heroXp;

  // Where each quest is done: today's training, the body map, and an exercise for the skill of the week.
  const skillQuest = quests.find((x) => x.key === 'skill');
  let skillLink: string | null = null;
  if (skillQuest?.skill) {
    const items = (
      await tx.query(
        `SELECT pi.id, pi.program_id, e.training_categories, e.movement_category
           FROM program_items pi JOIN programs p ON p.id = pi.program_id JOIN exercises e ON e.id = pi.exercise_id
          WHERE p.patient_id = $1 AND p.status = 'active' AND NOT p.is_template
          ORDER BY p.created_at, pi.position`,
        [patientId],
      )
    ).rows;
    const hit = items.find((r) => skillsForExercise(r.training_categories ?? [], r.movement_category).includes(skillQuest.skill!));
    skillLink = hit ? `/p/programma/${hit.program_id}/oefening/${hit.id}` : skillQuest.skill === 'strength' ? '/p/krachtlog' : null;
  }
  const questLinks = { train: '/p', checkin: '/p/held/pijn', skill: skillLink };

  // ---- Gear: bought in the shop with coins (1 per 10 hero XP); private to the patient. ----
  const reached = levelFor(xp);
  const bought = (await tx.query('SELECT item, price FROM hero_purchases WHERE patient_id = $1 ORDER BY bought_at', [patientId])).rows as { item: string; price: number }[];
  const owned = bought.map((r) => r.item).filter((k) => GEAR_KEYS.has(k));
  const chests = (await tx.query("SELECT to_char(day, 'YYYY-MM-DD') AS day, coins FROM hero_daily_chests WHERE patient_id = $1 ORDER BY day", [patientId])).rows as { day: string; coins: number }[];
  const earned = coinsEarned(xp) + chests.reduce((sum, r) => sum + r.coins, 0);
  const spent = bought.reduce((sum, r) => sum + r.price, 0);
  const equipped = onePerSlot(((heroRow?.gear ?? []) as string[]).filter((g) => owned.includes(g)));

  // ---- Daily check-in and the pain trend per area. ----
  const today = (await tx.query("SELECT to_char(now(), 'YYYY-MM-DD') AS d")).rows[0].d as string;
  const mainArea = [...(map.current?.entries ?? [])].sort((a, b) => b.score - a.score)[0]?.area ?? GENERAL_AREA;
  const checkin = { today: daily.find((d) => d.day === today) ?? null, area: mainArea, total: daily.length };
  // Day chest: earned by today's check-in or a workout finished today; opened once a day.
  const trainedToday = (
    await tx.query(
      "SELECT EXISTS (SELECT 1 FROM workout_sessions WHERE patient_id = $1 AND completed_at IS NOT NULL AND to_char(completed_at, 'YYYY-MM-DD') = $2) AS ok",
      [patientId, today],
    )
  ).rows[0].ok as boolean;
  const openedToday = chests.find((r) => r.day === today) ?? null;
  const chest = {
    available: !openedToday && (!!checkin.today || trainedToday),
    opened: openedToday ? { coins: openedToday.coins } : null,
    streak: chestStreak(chests.map((r) => r.day), today) + (openedToday ? 1 : 0),
  };
  const trends = await painTrends(tx, patientId);

  // ---- Quest: the goal of the current programme and the road there. ----
  const prog = (
    await tx.query(
      `SELECT title, series_key, series_title, phase_no, phase_count, phase_name, phase_goal, start_date, end_date FROM programs
        WHERE patient_id = $1 AND status = 'active' AND NOT is_template
        ORDER BY (module = 'revalidatie') DESC, (phase_no IS NOT NULL) DESC, updated_at DESC LIMIT 1`,
      [patientId],
    )
  ).rows[0];
  let quest = null;
  if (prog) {
    const phases = prog.series_key
      ? (await tx.query('SELECT * FROM app.patient_series_phases($1)', [prog.series_key])).rows.map((r) => ({ no: r.phase_no as number, name: r.phase_name as string | null, weeks: r.phase_weeks as string | null, goal: r.phase_goal as string | null }))
      : [];
    const timeline = prog.phase_no && phases.length ? questTimeline({ phases, currentNo: prog.phase_no, phaseStart: prog.start_date }) : null;
    // Without phases: the programme's own start and end date.
    let fallback = null;
    if (!timeline && prog.start_date && prog.end_date) {
      const a = new Date(prog.start_date + 'T12:00:00').getTime();
      const b = new Date(prog.end_date + 'T12:00:00').getTime();
      const now = Date.now();
      const totalWeeks = Math.max(1, Math.round((b - a) / (7 * 86400_000)));
      fallback = {
        week: Math.min(totalWeeks, Math.max(1, Math.floor((now - a) / (7 * 86400_000)) + 1)),
        totalWeeks,
        progress: Math.max(0, Math.min(1, (now - a) / (b - a))),
        expectedEnd: prog.end_date as string,
        weeksLeft: Math.max(0, Math.ceil((b - now) / (7 * 86400_000))),
      };
    }
    const lastGoal = [...phases].sort((x, y) => y.no - x.no)[0]?.goal ?? null;
    quest = {
      title: prog.series_title || prog.title,
      goal: lastGoal || prog.phase_goal || null,
      phaseNo: prog.phase_no,
      phaseCount: prog.phase_count,
      phaseGoal: prog.phase_goal,
      phases: phases.map((ph) => ({ ...ph, status: ph.no < prog.phase_no ? 'done' : ph.no === prog.phase_no ? 'current' : 'next' })),
      timeline: timeline ?? fallback,
    };
  }
  const since = (await tx.query('SELECT min(started_at) AS at FROM workout_sessions WHERE patient_id = $1', [patientId])).rows[0].at;
  const metricsRow = (await tx.query('SELECT weight_kg, body_fat_pct, height_cm, updated_at FROM patient_body_metrics WHERE patient_id = $1', [patientId])).rows[0];
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const metrics = {
    weightKg: num(metricsRow?.weight_kg),
    bodyFatPct: num(metricsRow?.body_fat_pct),
    heightCm: num(metricsRow?.height_cm),
    updatedAt: (metricsRow?.updated_at as string | undefined) ?? null,
  };

  const badges = BADGES.map((b) => ({ key: b.key, earned: b.earned({ ...badgeInput, bossesDefeated, chestRunBest: longestDayRun(chests.map((r) => r.day)), seasonsWon }) }));
  return {
    hero,
    painMap: map,
    level: reached,
    badges,
    skills,
    totalLevel: skillsSnap.totalLevel,
    disciplineStreak: skillsSnap.disciplineStreak,
    strengthEstimates: skillsSnap.strengthEstimates,
    totals: { sessions: s.sessions, fullWeeks, phasesCompleted: s.phases_done, since, painStart: painBaseline, painNow: map.checkins > 1 ? painNow : null },
    quest,
    weekly: { weekStart: thisWeek, quests, chestWeeks, xpPerQuest: QUEST_XP, chestXp: CHEST_XP, links: questLinks, boss: { ...boss, xp: BOSS_XP }, bossesDefeated,
      // This month's season and the trophies of seasons won (newest first).
      teamDone,
      season: { ...season, xp: SEASON_XP, trophies: seasonList.filter((x) => x.won).map((x) => ({ month: x.month, key: x.key })).reverse() } },
    // Coins stay with the patient: never on the friend card or the professional's view.
    gear: { owned, equipped, coins: Math.max(0, earned - spent), earned, spent, score: gearScore(equipped) },
    // Trophy cabinet: per skill at level 10/25/50/75/99; up to three on the shelf behind the hero.
    trophies: skillTrophies(skills),
    showcase: ((heroRow?.showcase ?? []) as string[]).filter((k) => skillTrophies(skills).some((t) => t.key === k && t.earned)),
    // Badges pinned on the wall behind the hero; only earned ones count.
    wallBadges: ((heroRow?.wall_badges ?? []) as string[]).filter((k) => badges.some((b) => b.key === k && b.earned)),
    metrics,
    checkin,
    chest,
    trends,
    logs: logged.view,
    // Walking aids the professional switched on (e.g. crutches); drawn on the hero, never on the friend card.
    aids: ((await tx.query('SELECT hero_aids FROM patients WHERE id = $1', [patientId])).rows[0]?.hero_aids ?? []) as string[],
  };
}

/** Per body area: every score over time, from body-map check-ins and daily check-ins. */
async function painTrends(tx: Tx, patientId: string) {
  const { rows } = await tx.query(
    `SELECT area, score, to_char(recorded_at, 'YYYY-MM-DD') AS day, 'map' AS source FROM pain_map_entries WHERE patient_id = $1 AND area <> 'none'
     UNION ALL SELECT area, score, day::text, 'daily' FROM daily_checkins WHERE patient_id = $1
     ORDER BY day`,
    [patientId],
  );
  const by = new Map<string, { day: string; score: number; source: string }[]>();
  for (const r of rows) {
    const list = by.get(r.area) ?? [];
    // One point per day and area: the last score of that day.
    const same = list.findIndex((x) => x.day === r.day);
    if (same >= 0) list[same] = { day: r.day, score: r.score, source: r.source };
    else list.push({ day: r.day, score: r.score, source: r.source });
    by.set(r.area, list);
  }
  return [...by.entries()].map(([area, points]) => ({ area, points }));
}

heroPatient.get('/hero', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(
    await withUser(user.id, async (tx) => {
      const state = await heroState(tx, patient.id);
      await refreshFriendCard(tx, patient.id, state);
      const team = await teamView(tx, patient.id, state);
      // A personal photo (own likeness, by request) replaces the generated one on this account only.
      const guest = state.hero?.photoKey && config.heroGuests.has(state.hero.photoKey) ? state.hero.photoKey : null;
      // teamDone is my own answer: it stays server-side, only the group status goes out.
      const { teamDone: _own, ...weekly } = state.weekly;
      return {
        ...state,
        weekly,
        team,
        customPhoto: config.personalHeroPhotos.get(user.email.toLowerCase()) ?? guest,
        heroGuests: [...config.heroGuests].map(([key, name]) => ({ key, name })),
      };
    }),
  );
});

// ---------------------------------------------------------------------------------------------
// Friends (opt-in). Friends see only the "hero card": name, look, level, total level and skill
// levels. The card is a snapshot written here, by the patient's own requests; see migration 013.
// ---------------------------------------------------------------------------------------------

type HeroStateT = Awaited<ReturnType<typeof heroState>>;
/** The only numbers a friend ever sees: levels, gear score, or a lock. No kilograms, pain, programme text or coins. */
export const friendCard = (s: HeroStateT) => ({
  level: s.level.level,
  totalLevel: s.totalLevel,
  gearScore: s.gear.score,
  skills: Object.fromEntries(s.skills.map((k) => [k.key, friendSkillCard(k)])) as Record<SkillKey, ReturnType<typeof friendSkillCard>>,
});

/** Write my own team snapshot (this week, done or not) and read the group's coarse status. */
async function teamView(tx: Tx, patientId: string, state: HeroStateT) {
  const row = (await tx.query('SELECT share_with_friends, team_opt_in, team_week, team_done FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0];
  const enabled = !!row?.share_with_friends && !!row?.team_opt_in;
  if (!enabled) return { enabled: false, canJoin: !!row?.share_with_friends, available: false as const, status: 'not_started' as const };
  const week = state.weekly.weekStart;
  const iso = (d: Date | string | null) => (d ? (typeof d === 'string' ? d.slice(0, 10) : d.toLocaleDateString('sv-SE')) : null);
  if (iso(row.team_week) !== week || row.team_done !== state.weekly.teamDone)
    await tx.query('UPDATE patient_heroes SET team_week = $2, team_done = $3 WHERE patient_id = $1', [patientId, week, state.weekly.teamDone]);
  const c = (await tx.query('SELECT participants, contributed FROM app.hero_team_week($1, $2::date)', [patientId, week])).rows[0];
  return { enabled: true, canJoin: true, ...teamWeekSummary(c?.participants ?? 0, c?.contributed ?? 0) };
}

/** Update the shared card when the patient shares and something changed. */
async function refreshFriendCard(tx: Tx, patientId: string, state?: HeroStateT) {
  const row = (await tx.query('SELECT share_with_friends, shared_stats FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0];
  if (!row?.share_with_friends) return;
  const card = friendCard(state ?? (await heroState(tx, patientId)));
  if (JSON.stringify(row.shared_stats) === JSON.stringify(card)) return;
  await tx.query('UPDATE patient_heroes SET shared_stats = $2, stats_updated_at = now() WHERE patient_id = $1', [patientId, JSON.stringify(card)]);
}

// No I/O/0/1, so codes are easy to read out loud.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newFriendCode = () => {
  const part = () => Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
  return `${part()}-${part()}`;
};

async function friendsView(tx: Tx, patientId: string) {
  const me = (await tx.query('SELECT share_with_friends, friend_code FROM patient_heroes WHERE patient_id = $1', [patientId])).rows[0];
  const friends = me?.share_with_friends
    ? (await tx.query('SELECT * FROM app.hero_friends($1)', [patientId])).rows.map((r) => ({
        id: r.id as string,
        kind: r.kind as 'friend' | 'incoming' | 'outgoing',
        heroName: r.hero_name as string,
        look: r.look,
        stats: r.stats ?? null,
        statsUpdatedAt: r.stats_updated_at ?? null,
        since: r.since,
      }))
    : [];
  return { hasHero: !!me, sharing: { enabled: !!me?.share_with_friends, code: me?.share_with_friends ? (me.friend_code as string) : null }, friends };
}

heroPatient.get('/hero/friends', async (c) => {
  const { user, patient } = requirePatient(c);
  return c.json(await withUser(user.id, (tx) => friendsView(tx, patient.id)));
});

/** Switch sharing on (creates a friend code and the card) or off (ends all friendships, removes code and card). */
heroPatient.put('/hero/sharing', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ enabled: z.boolean() }), await c.req.json());
  return c.json(
    await withUser(user.id, async (tx) => {
      const me = (await tx.query('SELECT friend_code FROM patient_heroes WHERE patient_id = $1', [patient.id])).rows[0];
      if (!me) throw badRequest('hero_required');
      if (b.enabled) {
        // A collision on the unique code is rare; retry inside a savepoint.
        for (let i = 0; ; i++) {
          await tx.query('SAVEPOINT code');
          try {
            await tx.query('UPDATE patient_heroes SET share_with_friends = true, friend_code = coalesce(friend_code, $2) WHERE patient_id = $1', [patient.id, newFriendCode()]);
            await tx.query('RELEASE SAVEPOINT code');
            break;
          } catch (err) {
            await tx.query('ROLLBACK TO SAVEPOINT code');
            if ((err as { code?: string }).code !== '23505' || i >= 5) throw err;
          }
        }
        await refreshFriendCard(tx, patient.id);
      } else {
        await tx.query('SELECT app.hero_friends_clear($1)', [patient.id]);
        await tx.query(
          'UPDATE patient_heroes SET share_with_friends = false, friend_code = NULL, shared_stats = NULL, stats_updated_at = NULL, team_opt_in = false, team_week = NULL, team_done = NULL WHERE patient_id = $1',
          [patient.id],
        );
      }
      return friendsView(tx, patient.id);
    }),
  );
});

/** Join or leave the team quest. Needs friend sharing; leaving removes my snapshot right away. */
heroPatient.put('/hero/team', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ enabled: z.boolean() }), await c.req.json());
  return c.json(
    await withUser(user.id, async (tx) => {
      const me = (await tx.query('SELECT share_with_friends FROM patient_heroes WHERE patient_id = $1', [patient.id])).rows[0];
      if (!me) throw badRequest('hero_required');
      if (b.enabled && !me.share_with_friends) throw badRequest('sharing_off');
      await tx.query(
        b.enabled ? 'UPDATE patient_heroes SET team_opt_in = true WHERE patient_id = $1' : 'UPDATE patient_heroes SET team_opt_in = false, team_week = NULL, team_done = NULL WHERE patient_id = $1',
        [patient.id],
      );
      return teamView(tx, patient.id, await heroState(tx, patient.id));
    }),
  );
});

/** Send a friend request with the other patient's friend code (accepts it when they already asked). */
heroPatient.post('/hero/friends', rateLimit('friend-request', 20, 15 * 60_000), async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ code: z.string().trim().min(4).max(20) }), await c.req.json());
  const result = await withUser(user.id, async (tx) => {
    if (!(await tx.query('SELECT 1 FROM patient_heroes WHERE patient_id = $1', [patient.id])).rowCount) throw badRequest('hero_required');
    return (await tx.query('SELECT app.hero_friend_request($1, $2) AS r', [patient.id, b.code.replace(/\s+/g, '').toUpperCase()])).rows[0].r as string;
  });
  const errors: Record<string, [number, string]> = {
    not_found: [404, 'friend_code_not_found'],
    self: [400, 'friend_self'],
    sharing_off: [409, 'sharing_off'],
    exists: [409, 'friend_exists'],
    limit: [409, 'friend_limit'],
  };
  if (errors[result]) throw new HttpError(errors[result][0], errors[result][1]);
  return c.json({ result }, result === 'requested' ? 201 : 200);
});

heroPatient.post('/hero/friends/:id/accept', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  const ok = await withUser(user.id, async (tx) => (await tx.query('SELECT app.hero_friend_respond($1, $2, true) AS ok', [patient.id, id])).rows[0].ok);
  if (!ok) throw notFound();
  return c.json({ ok: true });
});

/** Decline a request, cancel your own request, or remove a friend. */
heroPatient.delete('/hero/friends/:id', async (c) => {
  const { user, patient } = requirePatient(c);
  const id = parse(uuidParam, c.req.param('id'));
  const ok = await withUser(user.id, async (tx) => (await tx.query('SELECT app.hero_friend_respond($1, $2, false) AS ok', [patient.id, id])).rows[0].ok);
  if (!ok) throw notFound();
  return c.json({ ok: true });
});

/** Create or change the hero's look. */
heroPatient.put('/hero', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(look, await c.req.json());
  if (b.photoKey && !config.heroGuests.has(b.photoKey)) throw badRequest('unknown_guest_hero');
  const sports = [...new Set(b.sports ?? [b.sport])];
  const sport = sports[0];
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO patient_heroes(patient_id, practice_id, hero_name, frame, build, skin, hair, hair_color, eye_color, beard, glasses, outfit, sport, sports, photo_key)
       VALUES ($1, app.patient_practice($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (patient_id) DO UPDATE SET hero_name = EXCLUDED.hero_name, frame = EXCLUDED.frame, build = EXCLUDED.build,
         skin = EXCLUDED.skin, hair = EXCLUDED.hair, hair_color = EXCLUDED.hair_color, eye_color = EXCLUDED.eye_color,
         beard = EXCLUDED.beard, glasses = EXCLUDED.glasses, outfit = EXCLUDED.outfit, sport = EXCLUDED.sport, sports = EXCLUDED.sports, photo_key = EXCLUDED.photo_key, updated_at = now()`,
      [patient.id, b.heroName, b.frame, b.build, b.skin, b.hair, b.hairColor, b.eyeColor, b.beard, b.glasses, b.outfit, sport, sports, b.photoKey ?? null],
    ),
  );
  return c.json({ ok: true });
});

/** Put up to three earned trophies on the shelf behind the hero. */
heroPatient.put('/hero/showcase', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ trophies: z.array(z.string().max(30)).max(SHOWCASE_MAX) }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const state = await heroState(tx, patient.id);
    if (!state.hero) throw badRequest('hero_required');
    const earned = new Set(state.trophies.filter((t) => t.earned).map((t) => t.key));
    if (b.trophies.some((k) => !earned.has(k))) throw badRequest('trophy_not_earned');
    await tx.query('UPDATE patient_heroes SET showcase = $2, updated_at = now() WHERE patient_id = $1', [patient.id, [...new Set(b.trophies)]]);
  });
  return c.json({ ok: true });
});

/** Pin up to four earned badges on the wall behind the hero (an empty list takes the wall down). */
heroPatient.put('/hero/wall-badges', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ badges: z.array(z.string().max(40)).max(WALL_BADGES_MAX) }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const state = await heroState(tx, patient.id);
    if (!state.hero) throw badRequest('hero_required');
    const earned = new Set(state.badges.filter((x) => x.earned).map((x) => x.key));
    if (b.badges.some((k) => !earned.has(k))) throw badRequest('badge_not_earned');
    await tx.query('UPDATE patient_heroes SET wall_badges = $2, updated_at = now() WHERE patient_id = $1', [patient.id, [...new Set(b.badges)]]);
  });
  return c.json({ ok: true });
});

/** Self-reported weight, body fat and height. Only the patient (RLS); not shown to the practice. */
heroPatient.put('/hero/metrics', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(metricsBody, await c.req.json());
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO patient_body_metrics(patient_id, practice_id, weight_kg, body_fat_pct, height_cm)
       VALUES ($1, app.patient_practice($1), $2, $3, $4)
       ON CONFLICT (patient_id) DO UPDATE SET weight_kg = EXCLUDED.weight_kg, body_fat_pct = EXCLUDED.body_fat_pct,
         height_cm = EXCLUDED.height_cm, updated_at = now()`,
      [patient.id, b.weightKg, b.bodyFatPct, b.heightCm],
    ),
  );
  return c.json({ ok: true });
});

/** Open today's chest: a few coins, more for days in a row. Once a day, after a check-in or workout. */
heroPatient.post('/hero/chest', async (c) => {
  const { user, patient } = requirePatient(c);
  const out = await withUser(user.id, async (tx) => {
    const row = (await tx.query('SELECT 1 FROM patient_heroes WHERE patient_id = $1 FOR UPDATE', [patient.id])).rows[0];
    if (!row) throw badRequest('hero_required');
    const state = await heroState(tx, patient.id);
    if (state.chest.opened) throw badRequest('chest_opened');
    if (!state.chest.available) throw badRequest('chest_locked');
    const today = (await tx.query("SELECT to_char(now(), 'YYYY-MM-DD') AS d")).rows[0].d as string;
    const coins = dayChestCoins(patient.id, today, state.chest.streak);
    await tx.query('INSERT INTO hero_daily_chests (patient_id, day, coins) VALUES ($1, $2, $3)', [patient.id, today, coins]);
    const after = await heroState(tx, patient.id);
    return { coins, chest: after.chest, gear: after.gear };
  });
  return c.json(out, 201);
});

/** Buy a piece of gear with coins; it is worn right away (replacing what was in that slot). */
heroPatient.post('/hero/shop', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ item: z.string().max(32) }), await c.req.json());
  const item = GEAR.find((g) => g.key === b.item);
  if (!item) throw badRequest('unknown_gear');
  const gear = await withUser(user.id, async (tx) => {
    // One purchase at a time per patient, so two taps cannot spend the same coins twice.
    const row = (await tx.query('SELECT gear FROM patient_heroes WHERE patient_id = $1 FOR UPDATE', [patient.id])).rows[0];
    if (!row) throw badRequest('hero_required');
    const state = await heroState(tx, patient.id);
    if (state.gear.owned.includes(item.key)) throw badRequest('gear_owned');
    if (state.gear.coins < item.price) throw badRequest('not_enough_coins');
    await tx.query('INSERT INTO hero_purchases (patient_id, item, price) VALUES ($1, $2, $3)', [patient.id, item.key, item.price]);
    await tx.query('UPDATE patient_heroes SET gear = $2, updated_at = now() WHERE patient_id = $1', [patient.id, onePerSlot([...state.gear.equipped, item.key])]);
    return (await heroState(tx, patient.id)).gear;
  });
  return c.json(gear, 201);
});

/** Choose which owned gear the hero wears. */
heroPatient.put('/hero/gear', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ equipped: z.array(z.string()).max(24) }), await c.req.json());
  if (b.equipped.some((g) => !GEAR_KEYS.has(g))) throw badRequest('unknown_gear');
  await withUser(user.id, async (tx) => {
    const state = await heroState(tx, patient.id);
    if (!state.hero) throw badRequest('hero_required');
    if (b.equipped.some((g) => !state.gear.owned.includes(g))) throw badRequest('gear_not_owned');
    // One piece per slot (character screen); the newest choice wins.
    await tx.query('UPDATE patient_heroes SET gear = $2, updated_at = now() WHERE patient_id = $1', [patient.id, onePerSlot(b.equipped)]);
  });
  return c.json({ ok: true });
});

/** Daily check-in: one quick score for today (can be changed the same day). */
heroPatient.post('/hero/checkin', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(z.object({ area: z.string(), score: z.number().int().min(0).max(10) }), await c.req.json());
  if (b.area !== GENERAL_AREA && !AREA_KEYS.has(b.area)) throw badRequest('unknown_body_area');
  await withUser(user.id, (tx) =>
    tx.query(
      `INSERT INTO daily_checkins(patient_id, practice_id, day, area, score) VALUES ($1, app.patient_practice($1), now()::date, $2, $3)
       ON CONFLICT (patient_id, day) DO UPDATE SET area = EXCLUDED.area, score = EXCLUDED.score`,
      [patient.id, b.area, b.score],
    ),
  );
  return c.json({ ok: true }, 201);
});

/** A body-map check-in: every sore area with a score 0–10 (an empty list means "no pain"). */
heroPatient.post('/hero/pain-map', async (c) => {
  const { user, patient } = requirePatient(c);
  const b = parse(
    z.object({ entries: z.array(z.object({ area: z.string(), score: z.number().int().min(0).max(10) })).max(40) }),
    await c.req.json(),
  );
  if (b.entries.some((e) => !AREA_KEYS.has(e.area))) throw badRequest('unknown_body_area');
  if (new Set(b.entries.map((e) => e.area)).size !== b.entries.length) throw badRequest('duplicate_body_area');
  const batch = randomUUID();
  const rows = b.entries.length ? b.entries : [{ area: 'none', score: 0 }];
  await withUser(user.id, async (tx) => {
    for (const e of rows)
      await tx.query(
        `INSERT INTO pain_map_entries(patient_id, practice_id, batch, area, score) VALUES ($1, app.patient_practice($1), $2, $3, $4)`,
        [patient.id, batch, e.area, e.score],
      );
  });
  return c.json({ ok: true }, 201);
});

/** Therapist: the patient's hero and body map (first and latest check-in). */
heroStaff.get('/:id/hero', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  return c.json(
    await withUser(user.id, async (tx) => {
      const ok = (await tx.query('SELECT app.can_manage_patient($1) AS ok', [id])).rows[0].ok;
      if (!ok) throw notFound();
      const hero = mapHero((await tx.query('SELECT * FROM patient_heroes WHERE patient_id = $1', [id])).rows[0]);
      const inputs = await loadAdherenceInputs(tx, [id]);
      const skills = await loadSkillSnapshot(tx, id, weeklyForPatient(inputs, id, 52));
      const pt = (await tx.query('SELECT hero_aids FROM patients WHERE id = $1', [id])).rows[0];
      // Suggest crutches in the first phases of an ACL / knee post-op programme.
      const acl = (
        await tx.query(
          `SELECT 1 FROM programs WHERE patient_id = $1 AND status = 'active' AND coalesce(phase_no, 1) <= 2
              AND (coalesce(series_title, '') || ' ' || title || ' ' || coalesce(indication, '')) ~* '(kruisband|vkb|acl|knie.*(postoperatief|operatie)|menisc)'
            LIMIT 1`,
          [id],
        )
      ).rowCount;
      return {
        hero,
        aids: (pt?.hero_aids ?? []) as string[],
        suggestCrutches: !!acl,
        painMap: await painMap(tx, id),
        trends: await painTrends(tx, id),
        weekly: weeklyForPatient(inputs, id, 12),
        // Kilograms stay on the professional record. The friend card never includes this list.
        strengthEstimates: skills.strengthEstimates,
      };
    }),
  );
});

/** The professional switches walking aids on the patient's hero (e.g. crutches after ACL surgery). */
heroStaff.put('/:id/hero/aids', async (c) => {
  const { user } = requireStaff(c);
  const id = parse(uuidParam, c.req.param('id'));
  const b = parse(z.object({ crutches: z.boolean() }), await c.req.json());
  await withUser(user.id, async (tx) => {
    const r = await tx.query(
      `UPDATE patients SET hero_aids = CASE WHEN $2 THEN ARRAY['crutches'] ELSE '{}'::text[] END WHERE id = $1 AND app.can_manage_patient($1)`,
      [id, b.crutches],
    );
    if (!r.rowCount) throw notFound();
  });
  return c.json({ ok: true });
});
