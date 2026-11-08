import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GUILD_BOSS_HP, GUILD_MIN_COHORT, buildWorld, publicGuildRaid, restBuff, worldCopy, zoneTheme, type WorldProgram } from './worldMap';

const phase = (no: number, nodes: number): WorldProgram => ({
  id: `p${no}`,
  title: `Fase ${no}`,
  status: no === 2 ? 'active' : 'completed',
  module: 'revalidatie',
  seriesKey: 'knee',
  phaseNo: no,
  phaseName: `Fase ${no}`,
  phaseWeeks: null,
  phaseGoal: 'Doel',
  nodes,
  region: 'knee',
});

describe('zone themes', () => {
  it('names the examples and falls back when the region is unknown', () => {
    expect(zoneTheme('knee').nl).toBe('Knievallei');
    expect(zoneTheme('shoulder').nl).toBe('Schouderbergen');
    expect(zoneTheme('lumbar_spine').nl).toBe('Rugwoud');
    expect(zoneTheme('thoracic_spine').nl).toBe('Rugwoud');
    expect(zoneTheme(null)).toEqual({ region: null, nl: 'Het oefenland', en: 'The training land' });
    expect(zoneTheme('not-a-region').nl).toBe('Het oefenland');
  });
});

describe('world zones', () => {
  const base = {
    clinical: true,
    programs: [phase(1, 4), phase(2, 9)],
    phaseTemplates: [
      { no: 1, name: 'Basis', weeks: '1-4', goal: 'Bewegen' },
      { no: 2, name: 'Kracht', weeks: '5-8', goal: 'Controle' },
      { no: 3, name: 'Sport', weeks: '9-12', goal: 'Sport' },
    ],
    seriesRegion: 'knee',
    scheduledToday: 3,
    reportedPain: false,
    guild: { cohort: 2, workouts: 0, mine: 0 },
  };

  it('locks later phases even when the current phase has many workouts', () => {
    const world = buildWorld(base);
    expect(world.zones.map((z) => [z.no, z.status, z.locked, z.nodes, z.boss])).toEqual([
      [1, 'done', false, 4, 'past'],
      [2, 'current', false, 9, 'review'],
      [3, 'next', true, 0, 'locked'],
    ]);
    expect(world.heroZoneNo).toBe(2);
    expect(world.zones.every((z) => z.region === 'knee')).toBe(true);
  });

  it('does not open a locked zone when that phase somehow has sessions', () => {
    const world = buildWorld({
      ...base,
      programs: [phase(1, 4), phase(2, 40), { ...phase(3, 12), status: 'completed' }],
    });
    expect(world.zones[2]).toMatchObject({ status: 'next', locked: true, nodes: 12, boss: 'locked' });
  });

  it('uses one trail per programme when there is no phase series', () => {
    const world = buildWorld({
      ...base,
      clinical: false,
      seriesRegion: null,
      phaseTemplates: [],
      programs: [{
        ...phase(1, 2),
        seriesKey: null,
        phaseNo: null,
        phaseName: null,
        phaseGoal: 'Diagnose hoort hier niet',
        module: 'kracht',
        title: 'Kracht thuis',
        region: 'shoulder',
        status: 'active',
      }],
    });
    expect(world.zones).toHaveLength(1);
    expect(world.zones[0]).toMatchObject({ status: 'current', locked: false, nodes: 2, goal: null, region: 'shoulder' });
  });
});

describe('rest buff', () => {
  it('treats a programmed rest day and a pain report as protected', () => {
    expect(restBuff({ programmedRest: true, reportedPain: false })).toEqual({ active: true, reason: 'rest' });
    expect(restBuff({ programmedRest: false, reportedPain: true })).toEqual({ active: true, reason: 'pain' });
    expect(restBuff({ programmedRest: true, reportedPain: true }).reason).toBe('pain');
    expect(restBuff({ programmedRest: false, reportedPain: false }).active).toBe(false);
  });

  it('does not drop zones or nodes on a rest day', () => {
    const trained = buildWorld({
      clinical: true,
      programs: [phase(1, 3), phase(2, 5)],
      phaseTemplates: [{ no: 1, name: 'A', weeks: null, goal: null }, { no: 2, name: 'B', weeks: null, goal: null }],
      seriesRegion: 'knee',
      scheduledToday: 2,
      reportedPain: false,
      guild: { cohort: 1, workouts: 0, mine: 0 },
    });
    const resting = buildWorld({
      clinical: true,
      programs: [phase(1, 3), phase(2, 5)],
      phaseTemplates: [{ no: 1, name: 'A', weeks: null, goal: null }, { no: 2, name: 'B', weeks: null, goal: null }],
      seriesRegion: 'knee',
      scheduledToday: 0,
      reportedPain: true,
      guild: { cohort: 1, workouts: 0, mine: 0 },
    });
    expect(resting.rest).toEqual({ active: true, reason: 'pain' });
    expect(resting.zones).toEqual(trained.zones);
  });
});

describe('guild raid privacy', () => {
  it('hides every total below the cohort of five', () => {
    const hidden = publicGuildRaid({ cohort: GUILD_MIN_COHORT - 1, workouts: 12, mine: 1 }, 'patient');
    expect(hidden).toEqual({ available: false, reward: true });
    expect(JSON.stringify(hidden)).not.toMatch(/workout|cohort|mine|12/);
    expect(publicGuildRaid({ cohort: 4, workouts: 3, mine: 0 }, 'staff')).toEqual({ available: false });
  });

  it('shows only the aggregate once the cohort is large enough, and one session is enough for the banner', () => {
    const open = publicGuildRaid({ cohort: 8, workouts: 6, mine: 1 }, 'patient');
    expect(open).toEqual({ available: true, participantsBand: '5+', workouts: 6, bossHp: GUILD_BOSS_HP - 6, bossMaxHp: GUILD_BOSS_HP, defeated: false, reward: true });
    const staff = publicGuildRaid({ cohort: 8, workouts: 6, mine: 4 }, 'staff');
    expect(staff).not.toHaveProperty('reward');
    expect(JSON.stringify(staff)).not.toMatch(/mine|name|patient/);
  });

  it('stops the boss at zero without a bigger reward for extra sessions', () => {
    const once = publicGuildRaid({ cohort: 5, workouts: 80, mine: 1 }, 'patient');
    const many = publicGuildRaid({ cohort: 5, workouts: 80, mine: 9 }, 'patient');
    expect(once).toMatchObject({ bossHp: 0, defeated: true, reward: true });
    expect(many).toMatchObject({ bossHp: 0, defeated: true, reward: true });
    expect(Object.keys(once).sort()).toEqual(Object.keys(many).sort());
  });
});

describe('non-clinical copy', () => {
  it('keeps complaint and diagnosis wording out of coach and personal copy', () => {
    for (const kind of ['coach', 'personal'] as const) {
      const text = JSON.stringify(worldCopy(kind));
      expect(text.toLowerCase()).not.toMatch(/klacht|diagnose|revalidat|pijn/);
    }
    expect(worldCopy('physio').intro.nl).toMatch(/fysiotherapeut/);
    expect(worldCopy('physio').boss.nl).toBe('Hoofdstukbaas');
    expect(worldCopy('personal').boss.nl).toBe('Eindpunt');
  });
});

describe('guild migration', () => {
  it('is additive', () => {
    const sql = readFileSync(new URL('../server/db/migrations/037_practice_guild_raid.sql', import.meta.url), 'utf8').toLowerCase();
    expect(sql).toMatch(/security definer/);
    expect(sql).not.toMatch(/\bdrop\b|\btruncate\b|\bdelete from\b|\balter table\b/);
  });
});
