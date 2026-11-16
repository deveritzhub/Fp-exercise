(function () {
  "use strict";

  const LIB = window.EXERCISES || [];
  const LIB_BY_ID = Object.fromEntries(LIB.map((e) => [e.id, e]));
  const app = document.getElementById("app");
  const nav = document.getElementById("nav");

  // ---------- helpers ----------
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function encode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  // Accepts a full link, a "#/p/..." fragment or a bare code.
  function extractCode(input, kind) {
    const s = String(input || "").trim();
    const m = s.match(new RegExp("#/" + kind + "/([A-Za-z0-9_-]+)"));
    return m ? m[1] : s;
  }

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* private mode: ignore */ }
    },
  };

  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => dayKey(new Date());
  const fmtDate = (key, opts = { weekday: "short", day: "numeric", month: "short" }) =>
    new Date(key + "T12:00:00").toLocaleDateString("nl-NL", opts);
  const randomId = () => Math.random().toString(36).slice(2, 8);

  function exerciseInfo(item) {
    const base = item.i ? LIB_BY_ID[item.i] : null;
    return {
      title: item.c?.t || base?.title || "Oefening",
      desc: item.c?.d || base?.desc || "",
      cat: base?.cat || "Eigen oefening",
      unit: base?.unit || "sec",
    };
  }
  function doseText(item, unit) {
    const parts = [];
    if (item.s > 1) parts.push(`${item.s} sets`);
    if (item.r > 1) parts.push(`${item.r} herhalingen`);
    if (item.h > 0) parts.push(`${item.h} ${unit === "min" ? "minuten" : "sec vasthouden"}`);
    return parts.join(" · ") || "1 keer";
  }

  async function copy(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      ta.remove();
    }
    if (btn) { const t = btn.textContent; btn.textContent = "Gekopieerd ✓"; setTimeout(() => (btn.textContent = t), 1500); }
  }
  const baseUrl = () => location.href.split("#")[0];

  function setNav(active) {
    const links = [["#/maak", "Schema maken", "maak"], ["#/voortgang", "Voortgang bekijken", "voortgang"]];
    nav.innerHTML = links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("");
  }

  // ---------- home ----------
  function renderHome() {
    setNav("");
    app.innerHTML = `
      <h1>Thuisoefenen, simpel bijgehouden</h1>
      <p class="lead">Stel een oefenschema samen, stuur de link naar je patiënt en bekijk bij de volgende afspraak hoe het oefenen ging.</p>
      <div class="choice">
        <a href="#/maak"><div class="card">
          <span class="tag">Fysiotherapeut</span>
          <h2>Schema maken</h2>
          <p class="muted">Kies oefeningen uit de bibliotheek, stel sets en herhalingen in en deel de link.</p>
        </div></a>
        <a href="#/voortgang"><div class="card">
          <span class="tag">Fysiotherapeut</span>
          <h2>Voortgang bekijken</h2>
          <p class="muted">Open de voortgangslink die je patiënt heeft gestuurd: trouw, pijnscores en notities.</p>
        </div></a>
      </div>
      <h2>Hoe het werkt</h2>
      <div class="card">
        <ol>
          <li>Jij maakt een schema en kopieert de link.</li>
          <li>De patiënt opent de link op de telefoon, vinkt elke dag de oefeningen af en geeft een pijnscore.</li>
          <li>De patiënt stuurt vóór de afspraak een voortgangslink terug.</li>
        </ol>
        <p class="muted small">Privacy: het schema staat alleen in de link en de voortgang alleen op het toestel van de patiënt. Gebruik in de schemanaam bij voorkeur initialen in plaats van een volledige naam.</p>
      </div>`;
  }

  // ---------- builder ----------
  const DRAFT_KEY = "fp-draft";
  function newDraft() {
    return { v: 1, id: randomId(), n: "", t: "", m: "", f: "1x per dag", x: [] };
  }

  function renderBuilder(fromCode) {
    setNav("maak");
    let draft = store.get(DRAFT_KEY, null) || newDraft();
    if (fromCode) {
      try { draft = decode(fromCode); store.set(DRAFT_KEY, draft); } catch { /* ignore */ }
    }
    let filter = { cat: "Alle", q: "" };
    let generated = "";

    const save = () => store.set(DRAFT_KEY, draft);
    const cats = ["Alle", ...new Set(LIB.map((e) => e.cat))];

    function draw() {
      const selectedIds = new Set(draft.x.map((x) => x.i).filter(Boolean));
      const q = filter.q.toLowerCase();
      const lib = LIB.filter((e) => (filter.cat === "Alle" || e.cat === filter.cat) &&
        (!q || e.title.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)));

      app.innerHTML = `
        <h1>Schema maken</h1>
        <div class="card">
          <div class="grid2">
            <div><label for="f-n">Schema voor (bij voorkeur initialen)</label><input id="f-n" value="${esc(draft.n)}" placeholder="bijv. J.B. – knie"></div>
            <div><label for="f-t">Fysiotherapeut / praktijk</label><input id="f-t" value="${esc(draft.t)}" placeholder="bijv. Fysio Centrum"></div>
            <div><label for="f-f">Hoe vaak</label><input id="f-f" value="${esc(draft.f)}" placeholder="bijv. 2x per dag"></div>
          </div>
          <div style="margin-top:12px"><label for="f-m">Bericht aan de patiënt (optioneel)</label>
          <textarea id="f-m" placeholder="bijv. Stop bij scherpe pijn. Lichte spierpijn is normaal.">${esc(draft.m)}</textarea></div>
        </div>

        <h2>Gekozen oefeningen (${draft.x.length})</h2>
        ${draft.x.length ? "" : `<p class="muted">Nog niets gekozen. Voeg hieronder oefeningen toe.</p>`}
        ${draft.x.map((item, idx) => {
          const info = exerciseInfo(item);
          return `<div class="card">
            <div class="row spread">
              <div><span class="tag">${esc(info.cat)}</span> <b>${esc(info.title)}</b></div>
              <div class="row">
                <button class="ghost small" data-move="${idx}:-1" ${idx === 0 ? "disabled" : ""} aria-label="Omhoog">↑</button>
                <button class="ghost small" data-move="${idx}:1" ${idx === draft.x.length - 1 ? "disabled" : ""} aria-label="Omlaag">↓</button>
                <button class="danger small" data-remove="${idx}">Verwijder</button>
              </div>
            </div>
            <div class="dose">
              <label>Sets <input type="number" min="1" max="20" data-dose="${idx}:s" value="${item.s}"></label>
              <label>Herhalingen <input type="number" min="1" max="100" data-dose="${idx}:r" value="${item.r}"></label>
              <label>${info.unit === "min" ? "Minuten" : "Vasthouden (sec)"} <input type="number" min="0" max="600" data-dose="${idx}:h" value="${item.h}"></label>
            </div>
            <div style="margin-top:8px"><input data-note="${idx}" value="${esc(item.o || "")}" placeholder="Extra aanwijzing (optioneel)"></div>
          </div>`;
        }).join("")}

        <div class="card">
          <div class="row spread">
            <b>Link voor de patiënt</b>
            <div class="row">
              <button id="gen" ${draft.x.length ? "" : "disabled"}>Link maken</button>
              <button class="ghost" id="reset">Nieuw schema</button>
            </div>
          </div>
          ${generated ? `
            <p class="linkbox notice" id="link">${esc(generated)}</p>
            <div class="row">
              <button id="copy">Kopieer link</button>
              <a class="btn ghost" href="${esc(generated)}" target="_blank" rel="noopener">Bekijk als patiënt</a>
              <a class="btn ghost" href="mailto:?subject=${encodeURIComponent("Je oefenschema")}&body=${encodeURIComponent("Hierbij je oefenschema:\n\n" + generated)}">Mail</a>
            </div>
            <p class="muted small">Wijzig je het schema later? Maak dan een nieuwe link en stuur die opnieuw. De patiënt houdt zijn voortgang.</p>` : ""}
        </div>

        <h2>Oefenbibliotheek</h2>
        <div class="card">
          <div class="row" style="margin-bottom:8px">
            <select id="cat" style="width:auto">${cats.map((c) => `<option ${c === filter.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
            <input id="q" style="flex:1;min-width:160px" placeholder="Zoeken…" value="${esc(filter.q)}">
          </div>
          ${lib.map((e) => `
            <div class="lib-item">
              <div><span class="tag">${esc(e.cat)}</span> <b>${esc(e.title)}</b>
                <div class="muted small">${esc(e.desc)}</div></div>
              <button class="small ${selectedIds.has(e.id) ? "ghost" : ""}" data-add="${e.id}">${selectedIds.has(e.id) ? "Nog een" : "Voeg toe"}</button>
            </div>`).join("") || `<p class="muted">Geen oefeningen gevonden.</p>`}
        </div>

        <h2>Eigen oefening</h2>
        <div class="card">
          <label for="c-t">Naam</label><input id="c-t">
          <label for="c-d" style="margin-top:8px">Uitleg</label><textarea id="c-d"></textarea>
          <div style="margin-top:8px"><button id="c-add" class="ghost">Eigen oefening toevoegen</button></div>
        </div>

        <h2>Bestaand schema aanpassen</h2>
        <div class="card">
          <label for="load">Plak een eerder gemaakte link</label>
          <div class="row"><input id="load" style="flex:1"><button class="ghost" id="load-btn">Laden</button></div>
          <p class="error small" id="load-err"></p>
        </div>`;

      bind();
    }

    function bind() {
      const field = (id, key) => app.querySelector(id).addEventListener("input", (e) => { draft[key] = e.target.value; generated = ""; save(); });
      field("#f-n", "n"); field("#f-t", "t"); field("#f-f", "f"); field("#f-m", "m");

      app.querySelectorAll("[data-dose]").forEach((el) => el.addEventListener("change", (e) => {
        const [idx, k] = e.target.dataset.dose.split(":");
        draft.x[idx][k] = Math.max(0, parseInt(e.target.value, 10) || 0);
        generated = ""; save();
      }));
      app.querySelectorAll("[data-note]").forEach((el) => el.addEventListener("input", (e) => {
        draft.x[e.target.dataset.note].o = e.target.value; generated = ""; save();
      }));
      app.querySelectorAll("[data-remove]").forEach((el) => el.addEventListener("click", () => {
        draft.x.splice(+el.dataset.remove, 1); generated = ""; save(); draw();
      }));
      app.querySelectorAll("[data-move]").forEach((el) => el.addEventListener("click", () => {
        const [idx, dir] = el.dataset.move.split(":").map(Number);
        const [it] = draft.x.splice(idx, 1); draft.x.splice(idx + dir, 0, it);
        generated = ""; save(); draw();
      }));
      app.querySelectorAll("[data-add]").forEach((el) => el.addEventListener("click", () => {
        const e = LIB_BY_ID[el.dataset.add];
        draft.x.push({ i: e.id, s: e.s, r: e.r, h: e.h });
        generated = ""; save(); draw();
      }));
      app.querySelector("#cat").addEventListener("change", (e) => { filter.cat = e.target.value; draw(); });
      const qEl = app.querySelector("#q");
      qEl.addEventListener("input", (e) => {
        filter.q = e.target.value; draw();
        const n = app.querySelector("#q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length);
      });
      app.querySelector("#c-add").addEventListener("click", () => {
        const t = app.querySelector("#c-t").value.trim();
        const d = app.querySelector("#c-d").value.trim();
        if (!t) return app.querySelector("#c-t").focus();
        draft.x.push({ c: { t, d }, s: 1, r: 10, h: 0 });
        generated = ""; save(); draw();
      });
      app.querySelector("#gen").addEventListener("click", () => {
        draft.d = today();
        save();
        generated = `${baseUrl()}#/p/${encode(draft)}`;
        draw();
        app.querySelector("#link")?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      app.querySelector("#copy")?.addEventListener("click", (e) => copy(generated, e.target));
      app.querySelector("#reset").addEventListener("click", () => {
        if (draft.x.length && !confirm("Huidig schema wissen en opnieuw beginnen?")) return;
        draft = newDraft(); generated = ""; save(); draw();
      });
      app.querySelector("#load-btn").addEventListener("click", () => {
        try {
          const p = decode(extractCode(app.querySelector("#load").value, "p"));
          if (!Array.isArray(p.x)) throw new Error();
          draft = p; generated = ""; save(); draw();
          window.scrollTo(0, 0);
        } catch {
          app.querySelector("#load-err").textContent = "Deze link kon niet worden gelezen.";
        }
      });
    }

    draw();
  }

  // ---------- patient ----------
  function renderPatient(code) {
    nav.innerHTML = "";
    let prog;
    try { prog = decode(code); if (!Array.isArray(prog.x)) throw new Error(); }
    catch { return renderError("Deze link naar het oefenschema is ongeldig of onvolledig. Vraag je fysiotherapeut om een nieuwe link."); }

    const key = "fp-log-" + prog.id;
    const log = store.get(key, { days: {} });
    const total = prog.x.length;
    const save = () => store.set(key, log);
    const dayOf = (k) => (log.days[k] ||= { done: [], pain: null, note: "" });
    let shareLink = "";

    function draw() {
      const t = today();
      const d = dayOf(t);
      const doneCount = d.done.length;
      const pct = total ? Math.round((doneCount / total) * 100) : 0;

      const week = [];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(); dt.setDate(dt.getDate() - i);
        const k = dayKey(dt);
        const e = log.days[k];
        week.push({ k, n: e ? e.done.length : 0, pain: e?.pain });
      }

      app.innerHTML = `
        <span class="tag">Mijn oefenschema</span>
        <h1>${esc(prog.n || "Oefenschema")}</h1>
        <p class="lead">${prog.t ? `Van ${esc(prog.t)}` : ""}${prog.t && prog.f ? " · " : ""}${prog.f ? esc(prog.f) : ""}</p>
        ${prog.m ? `<div class="notice" style="margin-bottom:12px">${esc(prog.m)}</div>` : ""}

        <div class="card">
          <div class="row spread"><b>Vandaag, ${esc(fmtDate(t, { weekday: "long", day: "numeric", month: "long" }))}</b><span class="muted">${doneCount} van ${total}</span></div>
          <div class="progressbar" style="margin-top:8px"><div style="width:${pct}%"></div></div>
        </div>

        ${prog.x.map((item, idx) => {
          const info = exerciseInfo(item);
          const done = d.done.includes(idx);
          return `<div class="card exercise ${done ? "done" : ""}">
            <input type="checkbox" id="ex-${idx}" data-ex="${idx}" ${done ? "checked" : ""} aria-label="${esc(info.title)} gedaan">
            <div>
              <label for="ex-${idx}" style="color:inherit;margin:0;cursor:pointer"><h3>${esc(info.title)}</h3></label>
              <div class="doseline">${esc(doseText(item, info.unit))}</div>
              <div class="small">${esc(info.desc)}</div>
              ${item.o ? `<div class="small" style="margin-top:4px"><b>Let op:</b> ${esc(item.o)}</div>` : ""}
            </div>
          </div>`;
        }).join("")}

        <div class="card">
          <b>Hoeveel pijn had je vandaag?</b>
          <p class="muted small" style="margin:2px 0 8px">0 = geen pijn, 10 = ergst denkbare pijn</p>
          <div class="pain">${Array.from({ length: 11 }, (_, n) =>
            `<button data-pain="${n}" class="${d.pain === n ? "sel" : ""}" aria-pressed="${d.pain === n}">${n}</button>`).join("")}</div>
          <label for="note" style="margin-top:12px">Opmerking voor je fysiotherapeut (optioneel)</label>
          <textarea id="note" placeholder="bijv. oefening 3 deed pijn">${esc(d.note)}</textarea>
        </div>

        <h2>Afgelopen week</h2>
        <div class="week">${week.map((w) => `
          <div class="day ${w.n === total && total ? "full" : ""}">
            <span class="muted">${esc(fmtDate(w.k, { weekday: "short" }))}</span>
            <b>${w.n}/${total}</b>
            <span class="muted">${w.pain == null ? "–" : "pijn " + w.pain}</span>
          </div>`).join("")}</div>

        <h2>Voortgang delen</h2>
        <div class="card">
          <p class="small" style="margin-top:0">Stuur vóór je volgende afspraak je voortgang naar je fysiotherapeut.</p>
          <button id="share">Voortgangslink maken</button>
          ${shareLink ? `
            <p class="linkbox notice" style="margin-top:10px">${esc(shareLink)}</p>
            <div class="row">
              <button id="copy-share">Kopieer</button>
              ${navigator.share ? `<button class="ghost" id="native-share">Delen…</button>` : ""}
              <a class="btn ghost" href="mailto:?subject=${encodeURIComponent("Mijn oefenvoortgang")}&body=${encodeURIComponent(shareLink)}">Mail</a>
            </div>` : ""}
          <p class="muted small">Tip: zet deze pagina op je beginscherm, dan heb je je schema altijd bij de hand. Je voortgang wordt alleen op dit toestel bewaard.</p>
        </div>`;
      bind();
    }

    function bind() {
      app.querySelectorAll("[data-ex]").forEach((el) => el.addEventListener("change", () => {
        const d = dayOf(today());
        const idx = +el.dataset.ex;
        d.done = el.checked ? [...new Set([...d.done, idx])].sort((a, b) => a - b) : d.done.filter((i) => i !== idx);
        shareLink = ""; save(); draw();
      }));
      app.querySelectorAll("[data-pain]").forEach((el) => el.addEventListener("click", () => {
        const d = dayOf(today());
        const n = +el.dataset.pain;
        d.pain = d.pain === n ? null : n;
        shareLink = ""; save(); draw();
      }));
      app.querySelector("#note").addEventListener("input", (e) => { dayOf(today()).note = e.target.value; shareLink = ""; save(); });
      app.querySelector("#share").addEventListener("click", () => {
        const days = Object.fromEntries(Object.entries(log.days)
          .filter(([, v]) => v.done.length || v.pain != null || v.note)
          .sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 60));
        const titles = prog.x.map((it) => exerciseInfo(it).title);
        shareLink = `${baseUrl()}#/v/${encode({ v: 1, id: prog.id, n: prog.n, x: titles, days, at: today() })}`;
        draw();
      });
      app.querySelector("#copy-share")?.addEventListener("click", (e) => copy(shareLink, e.target));
      app.querySelector("#native-share")?.addEventListener("click", () =>
        navigator.share({ title: "Mijn oefenvoortgang", url: shareLink }).catch(() => {}));
    }

    draw();
  }

  // ---------- progress viewer ----------
  function renderProgressInput() {
    setNav("voortgang");
    app.innerHTML = `
      <h1>Voortgang bekijken</h1>
      <p class="lead">Plak de voortgangslink die je patiënt heeft gestuurd (of open die link direct).</p>
      <div class="card">
        <label for="code">Voortgangslink</label>
        <textarea id="code"></textarea>
        <div style="margin-top:8px"><button id="go">Bekijken</button></div>
        <p class="error small" id="err"></p>
      </div>`;
    app.querySelector("#go").addEventListener("click", () => {
      const c = extractCode(app.querySelector("#code").value, "v");
      try { decode(c); location.hash = "#/v/" + c; }
      catch { app.querySelector("#err").textContent = "Deze link kon niet worden gelezen."; }
    });
  }

  function renderProgress(code) {
    setNav("voortgang");
    let data;
    try { data = decode(code); if (!data.days) throw new Error(); }
    catch { return renderError("Deze voortgangslink is ongeldig of onvolledig."); }

    const total = data.x.length;
    const days = Object.entries(data.days).sort(([a], [b]) => (a < b ? 1 : -1));
    const perEx = data.x.map((_, i) => days.filter(([, v]) => v.done.includes(i)).length);
    const pains = days.filter(([, v]) => v.pain != null);
    const avgPain = pains.length ? (pains.reduce((s, [, v]) => s + v.pain, 0) / pains.length).toFixed(1) : "–";
    const fullDays = days.filter(([, v]) => v.done.length === total).length;

    const first = days.length ? days[days.length - 1][0] : null;
    const span = first ? Math.round((new Date(data.at) - new Date(first)) / 864e5) + 1 : 0;

    app.innerHTML = `
      <span class="tag">Voortgang</span>
      <h1>${esc(data.n || "Oefenschema")}</h1>
      <p class="lead">Gedeeld op ${esc(fmtDate(data.at, { day: "numeric", month: "long", year: "numeric" }))}</p>
      <div class="grid2">
        <div class="card"><div class="muted small">Dagen met oefeningen</div><b style="font-size:24px">${days.filter(([, v]) => v.done.length).length}</b> <span class="muted">van ${span} dagen</span></div>
        <div class="card"><div class="muted small">Volledig schema gedaan</div><b style="font-size:24px">${fullDays}</b> <span class="muted">dagen</span></div>
        <div class="card"><div class="muted small">Gemiddelde pijnscore</div><b style="font-size:24px">${avgPain}</b> <span class="muted">(${pains.length} metingen)</span></div>
        <div class="card"><div class="muted small">Laatste pijnscore</div><b style="font-size:24px">${pains.length ? pains[0][1].pain : "–"}</b> <span class="muted">${pains.length ? esc(fmtDate(pains[0][0])) : ""}</span></div>
      </div>

      <h2>Per oefening</h2>
      <div class="card"><table>
        <tr><th>Oefening</th><th>Dagen gedaan</th></tr>
        ${data.x.map((t, i) => `<tr><td>${esc(t)}</td><td>${perEx[i]}${span ? ` <span class="muted">(${Math.round((perEx[i] / span) * 100)}%)</span>` : ""}</td></tr>`).join("")}
      </table></div>

      <h2>Per dag</h2>
      <div class="card"><table>
        <tr><th>Datum</th><th>Gedaan</th><th>Pijn</th><th>Opmerking</th></tr>
        ${days.map(([k, v]) => `<tr><td>${esc(fmtDate(k))}</td><td>${v.done.length}/${total}</td><td>${v.pain ?? "–"}</td><td>${esc(v.note || "")}</td></tr>`).join("")
          || `<tr><td colspan="4" class="muted">Nog geen gegevens.</td></tr>`}
      </table></div>`;
  }

  function renderError(msg) {
    app.innerHTML = `<div class="card"><h1>Oeps</h1><p>${esc(msg)}</p><a class="btn ghost" href="#/">Naar start</a></div>`;
  }

  // ---------- router ----------
  function route() {
    const h = location.hash || "#/";
    let m;
    if ((m = h.match(/^#\/p\/([A-Za-z0-9_-]+)/))) renderPatient(m[1]);
    else if ((m = h.match(/^#\/v\/([A-Za-z0-9_-]+)/))) renderProgress(m[1]);
    else if (h.startsWith("#/maak")) renderBuilder();
    else if (h.startsWith("#/voortgang")) renderProgressInput();
    else renderHome();
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
})();
