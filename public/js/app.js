import { EXERCISES, PROGRAMS, CLASSES, STATS, ZONES, ITEMS, SLOTS, ACHIEVEMENTS } from './data.js';
import {
  state, save, resetAll, importSave, levelInfo, zoneFor, nextZone, program, todaysLog,
  doneToday, boss, completeExercise, buy, toggleEquip, liveStreak, today,
} from './state.js';

const app = document.getElementById('app');
const ui = { view: 'quest', session: null, onboard: { step: 0, name: '', cls: null } };
let timer = null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Geluid en trillen ----------
let audioCtx = null;
function beep(freq = 880, ms = 150) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* geen audio */ }
}
const buzz = (p) => navigator.vibrate?.(p);

function stopTimer() { clearInterval(timer); timer = null; }

// ---------- Onderdelen ----------
function avatar(size = 'lg') {
  const cls = CLASSES[state.hero?.cls] || CLASSES.ridder;
  const eq = (slot) => (state.equipped[slot] ? `<span class="gear gear-${slot}">${ITEMS[state.equipped[slot]].icon}</span>` : '');
  return `<div class="avatar avatar-${size}"><span class="hero">${cls.hero}</span>${eq('head')}${eq('weapon')}${eq('shield')}${eq('pet')}</div>`;
}

function xpBar() {
  const l = levelInfo();
  return `<div class="xpbar" aria-label="XP"><div style="width:${l.pct}%"></div></div>
    <div class="xptext"><span>Level ${l.level}</span><span>${l.into} / ${l.need} XP</span></div>`;
}

function topBar() {
  return `<header class="topbar">
    <div class="who">${avatar('sm')}<div><strong>${esc(state.hero.name)}</strong><small>${CLASSES[state.hero.cls].name} · Lv ${levelInfo().level}</small></div></div>
    <div class="chips"><span class="chip" title="Reeks">🔥 ${liveStreak()}</span><span class="chip" title="Goud">🪙 ${state.gold}</span></div>
  </header>`;
}

function nav() {
  const tabs = [['quest', '⚔️', 'Quest'], ['hero', '🧝', 'Held'], ['shop', '🛒', 'Winkel'], ['log', '📜', 'Logboek']];
  return `<nav class="tabbar">${tabs.map(([v, i, l]) =>
    `<button data-nav="${v}" class="${ui.view === v ? 'active' : ''}"><span>${i}</span>${l}</button>`).join('')}</nav>`;
}

// ---------- Onboarding ----------
function viewOnboard() {
  const o = ui.onboard;
  if (o.step === 0) {
    return `<section class="onboard">
      <div class="logo">⚔️🦵</div>
      <h1>FP Quest</h1>
      <p class="lead">Je oefeningen van de fysio, maar dan als avontuur. Elke oefening geeft XP en goud, en elke dag wacht er een monster dat je alleen verslaat door je programma af te maken.</p>
      <label class="field">Hoe heet je held?
        <input id="heroName" maxlength="18" placeholder="Bijv. Sanne de Sterke" value="${esc(o.name)}" autocomplete="off"></label>
      <button class="btn primary" data-act="ob-next">Verder</button>
      <p class="fine">Let op: FP Quest vervangt geen fysiotherapeut. Doe alleen oefeningen die met je fysio zijn afgesproken en stop bij scherpe of toenemende pijn.</p>
    </section>`;
  }
  if (o.step === 1) {
    return `<section class="onboard"><h2>Kies je klasse</h2>
      <div class="cards">${Object.entries(CLASSES).map(([id, c]) => `
        <button class="card pick ${o.cls === id ? 'sel' : ''}" data-act="ob-cls" data-id="${id}">
          <span class="big">${c.hero}</span><strong>${c.icon} ${c.name}</strong><small>${c.desc}</small></button>`).join('')}
      </div>
      <button class="btn primary" data-act="ob-next" ${o.cls ? '' : 'disabled'}>Verder</button></section>`;
  }
  return `<section class="onboard"><h2>Kies je herstelpad</h2>
    <p class="muted">Kies het pad dat bij je klacht past, of overleg met je fysiotherapeut. Je kunt dit later wijzigen.</p>
    <div class="list">${programList()}</div></section>`;
}

function programList() {
  return Object.entries(PROGRAMS).map(([id, p]) => `
    <button class="row pick ${state.programId === id ? 'sel' : ''}" data-act="pick-program" data-id="${id}">
      <span class="big">${p.icon}</span><span><strong>${p.name}</strong><small>${p.desc} · ${p.exercises.length} oefeningen</small></span>
    </button>`).join('');
}

// ---------- Quest (vandaag) ----------
function viewQuest() {
  const p = program();
  const b = boss();
  const lvl = levelInfo().level;
  const zone = zoneFor(lvl);
  const done = p.exercises.filter(doneToday).length;
  const hpPct = b.maxHp ? Math.round((b.hp / b.maxHp) * 100) : 0;
  return `${topBar()}
  <main class="content">
    <section class="zone-banner"><span>${zone.icon}</span><div><small>Huidige zone</small><strong>${zone.name}</strong></div></section>
    <section class="boss ${b.defeated ? 'dead' : ''}">
      <div class="boss-icon">${b.defeated ? '💀' : b.icon}</div>
      <div class="boss-info">
        <small>Monster van vandaag</small>
        <strong>${b.name}</strong>
        <div class="hpbar"><div style="width:${hpPct}%"></div></div>
        <small>${b.defeated ? 'Verslagen! Kom morgen terug voor een nieuw monster.' : `${b.hp} / ${b.maxHp} HP · <em>"${b.taunt}"</em>`}</small>
      </div>
    </section>
    <div class="section-head"><h2>${p.icon} ${p.name}</h2><span class="muted">${done}/${p.exercises.length}</span></div>
    <div class="list">${p.exercises.map((id) => {
      const ex = EXERCISES[id];
      const d = doneToday(id);
      const dose = ex.type === 'hold' ? `${ex.sets}× ${ex.reps}× ${ex.hold}s` : `${ex.sets}× ${ex.reps}`;
      return `<button class="row quest ${d ? 'done' : ''}" data-act="start" data-id="${id}">
        <span class="big">${d ? '✅' : ex.icon}</span>
        <span><strong>${ex.name}</strong><small>${dose} · ${STATS[ex.stat].icon} ${STATS[ex.stat].label}</small></span>
        <span class="xp">${d ? 'gedaan' : `+${ex.xp} XP`}</span></button>`;
    }).join('')}</div>
    <p class="fine">Pijn tijdens oefenen mag tot ongeveer 3–4 op 10 en moet binnen een dag weer gezakt zijn. Twijfel je? Overleg met je fysio.</p>
  </main>${nav()}`;
}

// ---------- Oefensessie ----------
function startSession(exId) {
  const ex = EXERCISES[exId];
  ui.session = { exId, set: 1, rep: 0, phase: 'ready', remaining: ex.hold || 0, pain: 2, effort: 'goed' };
  ui.view = 'workout';
  render();
}

function tick(onDone) {
  stopTimer();
  timer = setInterval(() => {
    const s = ui.session;
    if (!s) return stopTimer();
    s.remaining--;
    if (s.remaining <= 3 && s.remaining > 0) beep(660, 80);
    if (s.remaining <= 0) { stopTimer(); onDone(); } else updateTimer();
  }, 1000);
}

function updateTimer() {
  const el = document.getElementById('countdown');
  if (el) el.textContent = ui.session.remaining;
  const ring = document.getElementById('ring');
  if (ring) {
    const s = ui.session;
    const total = s.phase === 'rest' ? EXERCISES[s.exId].rest : s.phase === 'pause' ? 3 : EXERCISES[s.exId].hold;
    ring.style.setProperty('--p', `${(s.remaining / total) * 100}`);
  }
}

function repDone() {
  const s = ui.session;
  const ex = EXERCISES[s.exId];
  s.rep++;
  buzz(30);
  if (s.rep >= ex.reps) return setDone();
  if (ex.type === 'hold') {
    beep(990, 120);
    s.phase = 'pause';
    s.remaining = 3;
    render();
    tick(() => { s.phase = 'holding'; s.remaining = ex.hold; beep(880, 120); render(); tick(repDone); });
  } else {
    render();
  }
}

function setDone() {
  const s = ui.session;
  const ex = EXERCISES[s.exId];
  stopTimer();
  beep(1200, 200);
  buzz([60, 40, 60]);
  if (s.set >= ex.sets) { s.phase = 'feedback'; return render(); }
  s.phase = 'rest';
  s.remaining = ex.rest;
  render();
  tick(nextSet);
}

function nextSet() {
  const s = ui.session;
  stopTimer();
  s.set++;
  s.rep = 0;
  s.phase = 'ready';
  s.remaining = EXERCISES[s.exId].hold || 0;
  beep(880, 150);
  render();
}

function viewWorkout() {
  const s = ui.session;
  const ex = EXERCISES[s.exId];
  const dots = Array.from({ length: ex.sets }, (_, i) =>
    `<span class="dot ${i + 1 < s.set || s.phase === 'feedback' ? 'full' : i + 1 === s.set ? 'now' : ''}"></span>`).join('');
  let body = '';

  if (s.phase === 'feedback') {
    body = `<div class="feedback">
      <h3>Hoeveel pijn had je tijdens de oefening?</h3>
      <div class="pain"><input type="range" id="pain" min="0" max="10" value="${s.pain}"><output id="painOut">${s.pain}</output></div>
      <div class="scale"><span>0 geen</span><span>10 ergst denkbaar</span></div>
      <div id="painWarn" class="warn" ${s.pain >= 6 ? '' : 'hidden'}>⚠️ Dat is veel pijn. Doe deze oefening rustiger of sla hem over, en bespreek het met je fysiotherapeut.</div>
      <h3>Hoe zwaar was het?</h3>
      <div class="seg">${['makkelijk', 'goed', 'zwaar'].map((e) =>
        `<button data-act="effort" data-id="${e}" class="${s.effort === e ? 'sel' : ''}">${{ makkelijk: '😌', goed: '💪', zwaar: '🥵' }[e]} ${e}</button>`).join('')}</div>
      <button class="btn primary" data-act="finish">Buit ophalen ⚔️</button></div>`;
  } else if (s.phase === 'rest') {
    body = `<div class="timer"><div id="ring" class="ring rest" style="--p:100"><span id="countdown">${s.remaining}</span><small>rust</small></div></div>
      <p class="center muted">Set ${s.set} klaar! Even uitrusten.</p>
      <button class="btn" data-act="skip-rest">Rust overslaan ⏭️</button>`;
  } else if (ex.type === 'hold') {
    const label = s.phase === 'holding' ? 'vasthouden' : s.phase === 'pause' ? 'ontspan' : 'klaar?';
    body = `<div class="timer"><div id="ring" class="ring ${s.phase}" style="--p:100"><span id="countdown">${s.phase === 'ready' ? ex.hold : s.remaining}</span><small>${label}</small></div></div>
      <p class="center">Herhaling <strong>${Math.min(s.rep + 1, ex.reps)}</strong> van ${ex.reps}</p>
      ${s.phase === 'ready' ? '<button class="btn primary" data-act="hold-start">Start ▶</button>' : '<button class="btn" data-act="set-done">Set afronden</button>'}`;
  } else {
    body = `<button class="tap" data-act="rep"><span>${s.rep}</span><small>/ ${ex.reps}</small><em>tik per herhaling</em></button>
      <button class="btn" data-act="set-done">Hele set gedaan ✔</button>`;
  }

  return `<main class="content workout">
    <div class="wo-head"><button class="icon-btn" data-act="quit" aria-label="Stoppen">✕</button><div class="dots">${dots}</div><span class="muted">Set ${Math.min(s.set, ex.sets)}/${ex.sets}</span></div>
    <div class="wo-title"><span class="big">${ex.icon}</span><h2>${ex.name}</h2></div>
    <details class="how" ${s.set === 1 && s.rep === 0 && s.phase === 'ready' ? 'open' : ''}><summary>Uitleg</summary><p>${ex.how}</p></details>
    ${body}
  </main>`;
}

// ---------- Beloningen ----------
function showEvents(events) {
  const parts = events.map((e) => {
    switch (e.type) {
      case 'reward': return `<div class="ev"><strong>+${e.xp} XP</strong> · <strong>+${e.gold} 🪙</strong>${e.stat ? `<br><small>${STATS[e.stat].icon} ${STATS[e.stat].label} +1</small>` : ''}${e.repeat ? '<br><small>Al gedaan vandaag: kleinere beloning</small>' : ''}</div>`;
      case 'damage': return `<div class="ev hit">💥 ${e.dmg} schade aan ${e.boss.name}!</div>`;
      case 'victory': return `<div class="ev big-ev">🏆 ${e.boss.name} is verslagen!<br><small>Buit: +${e.gold} 🪙</small></div>`;
      case 'streak': return `<div class="ev">🔥 ${e.count} dagen op rij!</div>`;
      case 'levelup': return `<div class="ev big-ev">⭐ LEVEL UP! ⭐<br>Je bent nu level ${e.level}</div>`;
      case 'zone': return `<div class="ev">${e.zone.icon} Nieuwe zone ontdekt: <strong>${e.zone.name}</strong></div>`;
      case 'achievement': return `<div class="ev">${e.icon} Prestatie: <strong>${e.name}</strong></div>`;
      default: return '';
    }
  }).join('');
  if (!parts) return;
  const big = events.some((e) => e.type === 'levelup' || e.type === 'victory');
  if (big) { buzz([80, 50, 80, 50, 200]); beep(523, 120); setTimeout(() => beep(659, 120), 130); setTimeout(() => beep(784, 250), 260); }
  const dlg = document.createElement('div');
  dlg.className = 'overlay';
  dlg.innerHTML = `<div class="modal ${big ? 'celebrate' : ''}">${avatar('lg')}${parts}<button class="btn primary" data-act="close-modal">Verder</button></div>`;
  document.body.appendChild(dlg);
}

// ---------- Held ----------
function viewHero() {
  const l = levelInfo();
  const nz = nextZone(l.level);
  const maxStat = Math.max(10, ...Object.values(state.stats));
  return `${topBar()}<main class="content">
    <section class="hero-card">${avatar('xl')}<h2>${esc(state.hero.name)}</h2><p class="muted">${CLASSES[state.hero.cls].icon} ${CLASSES[state.hero.cls].name}</p>${xpBar()}</section>
    <h2>Eigenschappen</h2>
    <div class="stats">${Object.entries(STATS).map(([k, s]) => `
      <div class="stat"><span>${s.icon} ${s.label}</span><div class="bar"><div style="width:${(state.stats[k] / maxStat) * 100}%"></div></div><strong>${state.stats[k]}</strong></div>`).join('')}</div>
    <h2>Wereldkaart</h2>
    <ol class="map">${ZONES.map((z) => `<li class="${l.level >= z.from ? 'open' : ''} ${zoneFor(l.level) === z ? 'here' : ''}">
      <span>${l.level >= z.from ? z.icon : '🔒'}</span><div><strong>${z.name}</strong><small>vanaf level ${z.from}</small></div>${zoneFor(l.level) === z ? '<em>📍</em>' : ''}</li>`).join('')}</ol>
    ${nz ? `<p class="muted center">Nog ${nz.from - l.level} level(s) tot ${nz.icon} ${nz.name}</p>` : ''}
    <h2>Prestaties</h2>
    <div class="badges">${Object.entries(ACHIEVEMENTS).map(([id, a]) => `<div class="badge ${state.achievements.includes(id) ? 'got' : ''}" title="${a.desc}"><span>${a.icon}</span><small>${a.name}</small></div>`).join('')}</div>
    <h2>Herstelpad</h2>
    <div class="list">${programList()}</div>
    <h2>Instellingen</h2>
    <div class="list">
      <button class="row" data-act="rename"><span class="big">✏️</span><span><strong>Naam wijzigen</strong></span></button>
      <button class="row" data-act="backup"><span class="big">💾</span><span><strong>Back-up downloaden</strong><small>Je voortgang staat alleen op dit toestel</small></span></button>
      <label class="row"><span class="big">📂</span><span><strong>Back-up terugzetten</strong></span><input type="file" id="restore" accept="application/json" hidden></label>
      <button class="row danger" data-act="reset"><span class="big">🗑️</span><span><strong>Opnieuw beginnen</strong></span></button>
    </div>
  </main>${nav()}`;
}

// ---------- Winkel ----------
function viewShop() {
  return `${topBar()}<main class="content">
    <section class="hero-card small">${avatar('lg')}<p class="muted">Verdien goud met oefenen en monsters, en rust je held uit.</p></section>
    ${Object.entries(SLOTS).map(([slot, label]) => `<h2>${label}</h2><div class="shop">${Object.entries(ITEMS).filter(([, i]) => i.slot === slot).map(([id, i]) => {
      const owned = state.inventory.includes(id);
      const on = state.equipped[slot] === id;
      const btn = owned
        ? `<button class="btn small ${on ? '' : 'primary'}" data-act="equip" data-id="${id}">${on ? 'Afdoen' : 'Aandoen'}</button>`
        : `<button class="btn small primary" data-act="buy" data-id="${id}" ${state.gold < i.price ? 'disabled' : ''}>🪙 ${i.price}</button>`;
      return `<div class="item ${on ? 'on' : ''}"><span class="big">${i.icon}</span><small>${i.name}</small>${btn}</div>`;
    }).join('')}</div>`).join('')}
  </main>${nav()}`;
}

// ---------- Logboek ----------
function painTrend() {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = today(d);
    const entries = todaysLog(key);
    const avg = entries.length ? entries.reduce((s, e) => s + e.pain, 0) / entries.length : null;
    days.push({ key, avg, n: entries.length });
  }
  const w = 320, h = 110, pad = 18, step = (w - pad * 2) / 13;
  const y = (v) => h - pad - (v / 10) * (h - pad * 2);
  const pts = days.map((d, i) => (d.avg === null ? null : [pad + i * step, y(d.avg)])).filter(Boolean);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" class="trend" role="img" aria-label="Gemiddelde pijnscore per dag, laatste 14 dagen">
    ${[0, 5, 10].map((v) => `<line x1="${pad}" x2="${w - pad}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="2" y="${y(v) + 4}">${v}</text>`).join('')}
    ${days.map((d, i) => `<rect x="${pad + i * step - 4}" y="${h - 8}" width="8" height="${d.n ? 6 : 2}" rx="2" class="${d.n ? 'act' : 'none'}"/>`).join('')}
    ${pts.length > 1 ? `<path d="${line}" class="line"/>` : ''}
    ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" class="pt"/>`).join('')}
  </svg>`;
}

function viewLog() {
  const byDay = {};
  for (const e of state.log) (byDay[e.date] ||= []).push(e);
  const days = Object.keys(byDay).sort().reverse().slice(0, 30);
  const total = state.log.length;
  const active = Object.keys(byDay).length;
  return `${topBar()}<main class="content">
    <div class="kpis">
      <div><strong>${total}</strong><small>oefeningen</small></div>
      <div><strong>${active}</strong><small>actieve dagen</small></div>
      <div><strong>${state.streak.best}</strong><small>langste reeks</small></div>
    </div>
    <h2>Pijnverloop (14 dagen)</h2>
    <div class="card">${painTrend()}<small class="muted">Lijn = gemiddelde pijnscore (0–10). Balkjes = dagen dat je hebt geoefend.</small></div>
    <button class="btn" data-act="share">📤 Verslag delen met je fysio</button>
    <h2>Geschiedenis</h2>
    ${days.length ? days.map((d) => `<div class="day"><h3>${new Date(d + 'T12:00').toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}${state.bosses[d] ? ' · 🏆' : ''}</h3>
      ${byDay[d].map((e) => `<div class="logrow"><span>${EXERCISES[e.exId]?.icon || '•'} ${EXERCISES[e.exId]?.name || e.exId}</span><span class="muted">${e.sets}×${e.reps} · pijn ${e.pain} · ${e.effort}</span></div>`).join('')}</div>`).join('')
      : '<p class="muted center">Nog niets gelogd. Begin je eerste quest!</p>'}
  </main>${nav()}`;
}

function reportText() {
  const lines = [`FP Quest – oefenverslag van ${state.hero.name}`, `Herstelpad: ${program().name}`, ''];
  const byDay = {};
  for (const e of state.log) (byDay[e.date] ||= []).push(e);
  Object.keys(byDay).sort().slice(-14).forEach((d) => {
    lines.push(`${d}:`);
    byDay[d].forEach((e) => lines.push(`  - ${EXERCISES[e.exId]?.name}: ${e.sets}x${e.reps}, pijn ${e.pain}/10, ${e.effort}`));
  });
  return lines.join('\n');
}

// ---------- Render & events ----------
function render() {
  if (ui.view !== 'workout') stopTimer();
  if (!state.hero || !state.programId) { app.innerHTML = viewOnboard(); return; }
  const views = { quest: viewQuest, workout: viewWorkout, hero: viewHero, shop: viewShop, log: viewLog };
  app.innerHTML = (views[ui.view] || viewQuest)();
  if (ui.view === 'workout') updateTimer();
}

app.addEventListener('input', (e) => {
  if (e.target.id === 'pain') {
    ui.session.pain = Number(e.target.value);
    document.getElementById('painOut').textContent = e.target.value;
    document.getElementById('painWarn').hidden = ui.session.pain < 6;
  }
  if (e.target.id === 'heroName') ui.onboard.name = e.target.value;
});

app.addEventListener('change', (e) => {
  if (e.target.id === 'restore' && e.target.files[0]) {
    e.target.files[0].text().then((t) => {
      try { importSave(t); location.reload(); } catch (err) { alert('Dit bestand kon niet worden gelezen.'); }
    });
  }
});

document.addEventListener('click', async (e) => {
  const navBtn = e.target.closest('[data-nav]');
  if (navBtn) { ui.view = navBtn.dataset.nav; render(); window.scrollTo(0, 0); return; }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const id = el.dataset.id;
  const s = ui.session;

  switch (el.dataset.act) {
    case 'ob-next': {
      const o = ui.onboard;
      if (o.step === 0) {
        o.name = (document.getElementById('heroName')?.value || '').trim();
        if (!o.name) { document.getElementById('heroName').focus(); return; }
      }
      if (o.step === 1) state.hero = { name: o.name, cls: o.cls };
      o.step++;
      render();
      break;
    }
    case 'ob-cls': ui.onboard.cls = id; render(); break;
    case 'pick-program':
      state.programId = id;
      if (!state.hero) state.hero = { name: ui.onboard.name, cls: ui.onboard.cls };
      save();
      ui.view = ui.view === 'hero' ? 'hero' : 'quest';
      render();
      break;
    case 'start': startSession(id); break;
    case 'rep': repDone(); break;
    case 'hold-start':
      s.phase = 'holding'; s.remaining = EXERCISES[s.exId].hold; beep(880, 120); render(); tick(repDone);
      break;
    case 'set-done': s.rep = EXERCISES[s.exId].reps; setDone(); break;
    case 'skip-rest': nextSet(); break;
    case 'effort': s.effort = id; render(); break;
    case 'quit':
      if (confirm('Stoppen met deze oefening? Je voortgang van deze oefening gaat verloren.')) { ui.session = null; ui.view = 'quest'; render(); }
      break;
    case 'finish': {
      const ex = EXERCISES[s.exId];
      const events = completeExercise(s.exId, { sets: ex.sets, reps: ex.reps, pain: s.pain, effort: s.effort });
      ui.session = null; ui.view = 'quest'; render(); showEvents(events);
      break;
    }
    case 'close-modal': el.closest('.overlay').remove(); break;
    case 'buy': { const ev = buy(id); render(); if (ev.length) showEvents(ev); break; }
    case 'equip': toggleEquip(id); render(); break;
    case 'rename': {
      const n = prompt('Nieuwe naam voor je held:', state.hero.name);
      if (n && n.trim()) { state.hero.name = n.trim().slice(0, 18); save(); render(); }
      break;
    }
    case 'backup': {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `fpquest-backup-${today()}.json` });
      a.click(); URL.revokeObjectURL(a.href);
      break;
    }
    case 'reset':
      if (confirm('Weet je het zeker? Al je voortgang wordt gewist.')) { resetAll(); location.reload(); }
      break;
    case 'share': {
      const text = reportText();
      try {
        if (navigator.share) await navigator.share({ title: 'FP Quest oefenverslag', text });
        else { await navigator.clipboard.writeText(text); alert('Verslag gekopieerd. Plak het in een bericht aan je fysio.'); }
      } catch (err) { /* geannuleerd */ }
      break;
    }
  }
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
