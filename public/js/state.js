// Spelstatus: opslaan in localStorage, levels, beloningen en prestaties.
import { EXERCISES, PROGRAMS, CLASSES, MONSTERS, ZONES, ITEMS, ACHIEVEMENTS } from './data.js';

const KEY = 'fpquest-save-v1';

export function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
}

function fresh() {
  return {
    hero: null, // { name, cls }
    programId: null,
    xp: 0,
    gold: 0,
    stats: { kracht: 0, mobiliteit: 0, balans: 0, stabiliteit: 0 },
    log: [], // { date, ts, exId, sets, reps, pain, effort, xp, gold }
    streak: { count: 0, last: null, best: 0 },
    bosses: {}, // datum -> true als verslagen
    inventory: [],
    equipped: { head: null, weapon: null, shield: null, pet: null },
    achievements: [],
    totalReps: 0,
  };
}

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch (e) { /* opslag niet beschikbaar */ }
  return fresh();
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* negeren */ }
}

export function resetAll() {
  state = fresh();
  save();
}

export function importSave(json) {
  const data = JSON.parse(json);
  if (typeof data !== 'object' || !('xp' in data)) throw new Error('Ongeldig bestand');
  state = { ...fresh(), ...data };
  save();
}

// Level n -> n+1 kost 100 * n XP.
export function levelInfo(xp = state.xp) {
  let level = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) { rest -= need; level++; need = 100 * level; }
  return { level, into: rest, need, pct: Math.round((rest / need) * 100) };
}

export function zoneFor(level) {
  let z = ZONES[0];
  for (const zone of ZONES) if (level >= zone.from) z = zone;
  return z;
}

export function nextZone(level) {
  return ZONES.find((z) => z.from > level) || null;
}

function hash(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Math.abs(h);
}

export function program() {
  return PROGRAMS[state.programId];
}

export function todaysLog(date = today()) {
  return state.log.filter((l) => l.date === date);
}

export function doneToday(exId) {
  return todaysLog().some((l) => l.exId === exId);
}

// Het monster van vandaag; HP hangt af van het aantal oefeningen in het pad.
export function boss(date = today()) {
  const m = MONSTERS[hash(date + (state.hero?.name || '')) % MONSTERS.length];
  const exIds = program()?.exercises || [];
  const maxHp = exIds.reduce((s, id) => s + EXERCISES[id].xp, 0);
  const dmg = todaysLog(date)
    .filter((l) => exIds.includes(l.exId))
    .reduce((s, l, i, arr) => (arr.findIndex((x) => x.exId === l.exId) === i ? s + EXERCISES[l.exId].xp : s), 0);
  const level = levelInfo().level;
  return { ...m, level, maxHp, hp: Math.max(0, maxHp - dmg), defeated: !!state.bosses[date] };
}

function unlock(id, events) {
  if (!state.achievements.includes(id)) {
    state.achievements.push(id);
    events.push({ type: 'achievement', ...ACHIEVEMENTS[id] });
  }
}

function checkAchievements(events) {
  const lvl = levelInfo().level;
  if (state.log.length >= 1) unlock('first', events);
  if (Object.keys(state.bosses).length >= 1) unlock('boss1', events);
  if (state.streak.count >= 3) unlock('streak3', events);
  if (state.streak.count >= 7) unlock('streak7', events);
  if (state.streak.count >= 30) unlock('streak30', events);
  if (lvl >= 5) unlock('lvl5', events);
  if (lvl >= 10) unlock('lvl10', events);
  if (state.totalReps >= 500) unlock('reps500', events);
  if (state.inventory.length >= 1) unlock('shopper', events);
}

// Verwerk een voltooide oefening. Geeft een lijst met gebeurtenissen voor het beloningsscherm.
export function completeExercise(exId, { sets, reps, pain, effort }) {
  const ex = EXERCISES[exId];
  const date = today();
  const events = [];
  const levelBefore = levelInfo().level;
  const repeat = doneToday(exId);
  const bossBefore = boss();

  // XP: basis, klassebonus, en minder voor een herhaling op dezelfde dag.
  let xp = ex.xp;
  if (CLASSES[state.hero.cls]?.bonus === ex.stat) xp = Math.round(xp * 1.2);
  if (repeat) xp = Math.round(xp * 0.25);
  const gold = repeat ? 2 : 10 + Math.floor(Math.random() * 6);

  state.xp += xp;
  state.gold += gold;
  state.stats[ex.stat] += repeat ? 0 : 1;
  state.totalReps += sets * reps;
  state.log.push({ date, ts: Date.now(), exId, sets, reps, pain, effort, xp, gold });
  events.push({ type: 'reward', xp, gold, stat: repeat ? null : ex.stat, repeat });

  // Reeks bijwerken.
  if (state.streak.last !== date) {
    const gap = state.streak.last ? daysBetween(state.streak.last, date) : null;
    state.streak.count = gap === 1 ? state.streak.count + 1 : 1;
    state.streak.last = date;
    state.streak.best = Math.max(state.streak.best, state.streak.count);
    if (state.streak.count > 1) events.push({ type: 'streak', count: state.streak.count });
  }

  // Schade aan het dagmonster.
  const b = boss();
  if (!repeat && bossBefore.hp > b.hp) {
    events.push({ type: 'damage', dmg: bossBefore.hp - b.hp, boss: b });
  }
  if (b.hp === 0 && !state.bosses[date]) {
    state.bosses[date] = true;
    const loot = 40 + state.streak.count * 5;
    state.gold += loot;
    events.push({ type: 'victory', boss: b, gold: loot });
  }

  const levelAfter = levelInfo().level;
  if (levelAfter > levelBefore) {
    events.push({ type: 'levelup', level: levelAfter });
    const zb = zoneFor(levelBefore);
    const za = zoneFor(levelAfter);
    if (za !== zb) events.push({ type: 'zone', zone: za });
  }

  checkAchievements(events);
  save();
  return events;
}

export function buy(itemId) {
  const item = ITEMS[itemId];
  if (!item || state.inventory.includes(itemId) || state.gold < item.price) return [];
  state.gold -= item.price;
  state.inventory.push(itemId);
  state.equipped[item.slot] = itemId;
  const events = [];
  checkAchievements(events);
  save();
  return events;
}

export function toggleEquip(itemId) {
  const item = ITEMS[itemId];
  if (!state.inventory.includes(itemId)) return;
  state.equipped[item.slot] = state.equipped[item.slot] === itemId ? null : itemId;
  save();
}

// Reeks resetten als er een dag is overgeslagen (voor de weergave).
export function liveStreak() {
  if (!state.streak.last) return 0;
  return daysBetween(state.streak.last, today()) <= 1 ? state.streak.count : 0;
}
