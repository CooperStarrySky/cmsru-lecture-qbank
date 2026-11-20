/* home.js — question-bank dashboard: Create Test, Previous Tests, Performance, Lab Values. */
(async function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = Data.SOURCE_LABELS;
  const POOLS = { unused: "Unused", incorrect: "Incorrect", correct: "Correct", flagged: "Flagged" };
  const lecLabel = n => { const m = String(n).match(/^(\d+)\s+(.*)$/); return m ? `Lecture ${m[1]}: ${m[2]}` : n; };
  const pref = (k, d) => { const v = Store.pref(k); return v === undefined ? d : v; };

  const st = {
    block: pref("block", null),
    lecs: new Set(pref("lecs", [])),
    srcs: new Set(pref("srcs", Object.keys(SRC))),
    pools: new Set(pref("pools", ["unused", "incorrect", "correct", "flagged"])),
    open: new Set(pref("openWeeks", [])),
  };
  let lectures = [], questions = [];

  // ---------- theme + routing ----------
  $("#themeBtn").onclick = () => {
    const dark = document.documentElement.dataset.hTheme !== "dark";
    document.documentElement.dataset.hTheme = dark ? "dark" : ""; Store.pref("homeDark", dark);
  };
  $("#burger").onclick = () => document.body.classList.toggle("side-open");
  function route() {
    const v = (location.hash || "#create").slice(1);
    $$(".view").forEach(s => s.hidden = s.dataset.view !== v);
    $$(".h-side a[data-v]").forEach(a => a.classList.toggle("on", a.dataset.v === v));
    document.body.classList.remove("side-open");
    if (v === "previous") renderPrevious();
    if (v === "performance") renderPerformance();
    if (v === "labs") LabSheet.mount($("#labHost"));
  }
  addEventListener("hashchange", route);

  // ---------- data ----------
  try { lectures = await Data.manifest(); }
  catch (e) { $("#tree").innerHTML = `<div class="empty">Couldn't load the question list. Try reloading.</div>`; route(); return; }
  questions = lectures.length ? await Data.questions(lectures) : [];
  const blocks = [...new Set(lectures.map(l => l.block))];
  if (!blocks.includes(st.block)) st.block = blocks[blocks.length - 1];
  const known = new Set(lectures.map(l => l.lecture_id));
  st.lecs = new Set([...st.lecs].filter(id => known.has(id)));
  // first visit: start with the newest released week selected and opened, so Generate Test works right away
  if (Store.pref("lecs") === undefined && lectures.length) {
    const inBlock = lectures.filter(l => l.block === st.block);
    const lastWeek = Math.max(...inBlock.map(l => l.week));
    inBlock.filter(l => l.week === lastWeek).forEach(l => st.lecs.add(l.lecture_id));
    st.open.add(`${st.block}/${lastWeek}`);
  }

  const poolOf = q => {
    const s = Store.status(q.id), out = [s];
    if (Store.flagged(q.id)) out.push("flagged");
    return out;
  };
  const inPools = q => poolOf(q).some(p => st.pools.has(p));
  const eligible = q => st.srcs.has(q.source) && inPools(q);
  const picked = () => questions.filter(q => st.lecs.has(q.lecture_id) && eligible(q));
  function save() {
    Store.pref("block", st.block); Store.pref("lecs", [...st.lecs]); Store.pref("srcs", [...st.srcs]);
    Store.pref("pools", [...st.pools]); Store.pref("openWeeks", [...st.open]);
  }

  // ---------- test mode ----------
  $("#mTutor").checked = pref("tutor", true);
  $("#mTimed").checked = pref("timed", false);
  $("#spq").value = pref("spq", 90);
  $("#oShuffle").checked = pref("shuffle", true);
  $("#oFont").checked = !!pref("fontVar", false);
  const syncTimed = () => $("#spqWrap").classList.toggle("off", !$("#mTimed").checked);
  ["mTutor", "mTimed", "oShuffle", "oFont"].forEach(id => $("#" + id).addEventListener("change", () => {
    Store.pref("tutor", $("#mTutor").checked); Store.pref("timed", $("#mTimed").checked);
    Store.pref("shuffle", $("#oShuffle").checked); Store.pref("fontVar", $("#oFont").checked); syncTimed();
  }));
  $("#spq").onchange = () => Store.pref("spq", +$("#spq").value || 90);
  syncTimed();

  // ---------- question mode + sources (counts within the selected lectures) ----------
  function tick(group, key, label, on, n) {
    return `<label class="tick ${n === 0 ? "zero" : ""}"><input type="checkbox" data-g="${group}" data-k="${key}" ${on ? "checked" : ""}> ${esc(label)} <span class="cnt">${n}</span></label>`;
  }
  function renderFilters() {
    const base = questions.filter(q => st.lecs.has(q.lecture_id));
    const bySrc = base.filter(q => st.srcs.has(q.source));
    $("#pools").innerHTML = Object.entries(POOLS).map(([k, v]) => tick("pool", k, v, st.pools.has(k), bySrc.filter(q => poolOf(q).includes(k)).length)).join("");
    $("#sources").innerHTML = Object.entries(SRC).map(([k, v]) => tick("src", k, v, st.srcs.has(k), base.filter(q => q.source === k && inPools(q)).length)).join("");
  }
  document.addEventListener("change", e => {
    const t = e.target, g = t.dataset.g; if (!g) return;
    const set = g === "pool" ? st.pools : st.srcs;
    t.checked ? set.add(t.dataset.k) : set.delete(t.dataset.k);
    renderAll();
  });

  // ---------- lecture tree ----------
  function renderBlocks() {
    $("#blocks").innerHTML = blocks.map(b => `<button role="tab" aria-selected="${b === st.block}" data-b="${esc(b)}">${esc(b)}</button>`).join("");
  }
  $("#blocks").onclick = e => { const b = e.target.closest("[data-b]"); if (b) { st.block = b.dataset.b; renderAll(); } };

  function renderTree() {
    const ls = lectures.filter(l => l.block === st.block);
    if (!ls.length) { $("#tree").innerHTML = `<div class="empty">No weeks released yet. Check back Friday.</div>`; return; }
    const weeks = [...new Set(ls.map(l => l.week))];
    $("#tree").innerHTML = weeks.map(w => {
      const wl = ls.filter(l => l.week === w), key = `${st.block}/${w}`;
      const nSel = wl.filter(l => st.lecs.has(l.lecture_id)).length;
      const avail = questions.filter(q => q.block === st.block && q.week === w && eligible(q)).length;
      const open = st.open.has(key);
      return `<div class="wk ${open ? "open" : ""}">
        <div class="wk-h">
          <button class="wk-tog" data-open="${key}" aria-expanded="${open}" aria-label="Show lectures in week ${w}"><svg viewBox="0 0 12 8" width="12" height="8"><path d="M1 1.5l5 5 5-5" stroke="currentColor" stroke-width="1.8" fill="none"/></svg></button>
          <label class="tick"><input type="checkbox" data-week="${w}" ${nSel === wl.length ? "checked" : ""} data-ind="${nSel > 0 && nSel < wl.length}"> Week ${w}</label>
          <span class="wk-meta">${wl.length} lecture${wl.length > 1 ? "s" : ""}</span>
          <span class="cnt">${avail}</span>
        </div>
        <div class="wk-list">${wl.map(l => {
          const ids = questions.filter(q => q.lecture_id === l.lecture_id);
          const sm = Store.summary(ids.map(q => q.id));
          const n = ids.filter(eligible).length;
          const pct = sm.used ? `<span class="pct ${sm.pct >= 70 ? "good" : sm.pct >= 50 ? "mid" : "bad"}" title="${sm.used} of ${sm.total} answered">${sm.pct}%</span>` : `<span class="pct none">–</span>`;
          return `<label class="lec ${n === 0 ? "zero" : ""}"><input type="checkbox" data-lec="${l.lecture_id}" ${st.lecs.has(l.lecture_id) ? "checked" : ""}>
            <span class="lec-name">${esc(lecLabel(l.lecture))}</span>${pct}<span class="cnt">${n}</span></label>`;
        }).join("")}</div></div>`;
    }).join("");
    $$("#tree [data-ind='true']").forEach(x => x.indeterminate = true);
    const allSel = ls.every(l => st.lecs.has(l.lecture_id)), someSel = ls.some(l => st.lecs.has(l.lecture_id));
    $("#allLecs").checked = allSel; $("#allLecs").indeterminate = someSel && !allSel;
  }
  $("#tree").addEventListener("click", e => {
    const t = e.target.closest("[data-open]"); if (!t) return;
    const k = t.dataset.open; st.open.has(k) ? st.open.delete(k) : st.open.add(k); save();
    t.closest(".wk").classList.toggle("open"); t.setAttribute("aria-expanded", st.open.has(k));
  });
  $("#tree").addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.week) {
      for (const l of lectures.filter(l => l.block === st.block && String(l.week) === t.dataset.week))
        t.checked ? st.lecs.add(l.lecture_id) : st.lecs.delete(l.lecture_id);
    } else if (t.dataset.lec) t.checked ? st.lecs.add(t.dataset.lec) : st.lecs.delete(t.dataset.lec);
    renderAll();
  });
  $("#allLecs").onchange = e => {
    for (const l of lectures.filter(l => l.block === st.block)) e.target.checked ? st.lecs.add(l.lecture_id) : st.lecs.delete(l.lecture_id);
    renderAll();
  };

  // ---------- count + generate ----------
  function renderStart() {
    const n = picked().length, nq = $("#nQ");
    nq.max = n;
    if (n && (+nq.value > n || !+nq.value)) nq.value = Math.min(n, 40);
    $("#maxPill").textContent = n; $("#totalAvail").textContent = n;
    $("#maxHint").textContent = n ? "" : "Select at least one lecture with questions.";
    $("#start").disabled = !n;
  }
  $("#nQ").oninput = renderStart;

  function renderResume() {
    const s = Store.loadSession();
    if (!s || s.finished || String(s.id).startsWith("demo")) { $("#resume").innerHTML = ""; return; }
    const done = Object.keys(s.state?.answers || {}).length;
    $("#resume").innerHTML = `<div class="card resume"><div><b>Test in progress</b><div class="muted">${esc(s.title)} · ${done} of ${s.qids.length} answered</div></div>
      <span class="h-sp"></span><a class="gen-btn sm" href="${s.ui === "simple" ? "quiz.html" : "exam.html"}">Resume</a></div>`;
  }

  function renderAll() { save(); renderBlocks(); renderTree(); renderFilters(); renderStart(); }

  $("#start").onclick = () => {
    let pool = picked();
    if ($("#oShuffle").checked) pool = pool.map(q => [Math.random(), q]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    else pool.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    pool = pool.slice(0, Math.max(1, +$("#nQ").value || 20));
    const lecNames = [...new Set(pool.map(q => q.lecture))];
    const timed = $("#mTimed").checked, tutor = $("#mTutor").checked;
    const n = Store.history().length + 1;
    const sess = {
      id: "t" + Date.now(), ui: Store.pref("ui") || "examplify", tutor,
      title: `Test ${n} · ${st.block} · ${lecNames.length === 1 ? lecLabel(lecNames[0]) : lecNames.length + " lectures"}`,
      qids: pool.map(q => q.id),
      timeLimitSec: timed ? pool.length * Math.max(10, +$("#spq").value || 90) : 0,
      startedAt: Date.now(), fontVar: $("#oFont").checked, state: { tutor },
    };
    Store.saveSession(sess);
    location.href = sess.ui === "simple" ? "quiz.html" : "exam.html";
  };

  // ---------- previous tests ----------
  function scoreOf(s) {
    const map = Object.fromEntries(questions.map(q => [q.id, q.answer]));
    const a = s.state?.answers || {};
    const right = s.qids.filter(id => a[id] != null && a[id] === map[id]).length;
    return { right, answered: Object.keys(a).length, total: s.qids.length };
  }
  function renderPrevious() {
    const h = Store.history();
    if (!h.length) { $("#prevTbl").innerHTML = `<tr><td class="empty">No tests yet. Create one to get started.</td></tr>`; return; }
    $("#prevTbl").innerHTML = `<thead><tr><th>Score</th><th>Name</th><th>Mode</th><th class="num"># Qs</th><th>Date</th><th class="acts">Actions</th></tr></thead><tbody>` +
      h.map(s => {
        const sc = scoreOf(s), done = s.finished;
        const mode = [s.state?.tutor ?? s.tutor ? "Tutor" : null, s.timeLimitSec ? "Timed" : "Untimed"].filter(Boolean).join(", ");
        return `<tr><td>${done ? `<span class="score">${Math.round(100 * sc.right / sc.total)}%</span>` : `<span class="score open" title="${sc.answered}/${sc.total} answered">${sc.answered}/${sc.total}</span>`}</td>
          <td><b class="t-name">${esc(s.title)}</b><div class="muted sm">${done ? "Completed" : "In progress"}</div></td><td>${mode}</td><td class="num">${sc.total}</td>
          <td>${new Date(s.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
          <td class="acts"><button class="o-btn sm" data-open-test="${esc(s.id)}">${done ? "Review" : "Resume"}</button><button class="o-btn sm ghost" data-del-test="${esc(s.id)}" aria-label="Delete">✕</button></td></tr>`;
      }).join("") + `</tbody>`;
  }
  $("#prevTbl").onclick = e => {
    const o = e.target.closest("[data-open-test]"), d = e.target.closest("[data-del-test]");
    if (o) { const s = Store.openFromHistory(o.dataset.openTest); if (s) location.href = s.ui === "simple" ? "quiz.html" : "exam.html"; }
    if (d && confirm("Remove this test from your history? Your answers still count in Performance.")) { Store.deleteFromHistory(d.dataset.delTest); renderPrevious(); renderResume(); }
  };

  // ---------- performance ----------
  function renderPerformance() {
    const all = Store.summary(questions.map(q => q.id));
    const nInc = questions.filter(q => Store.status(q.id) === "incorrect").length;
    const donut = (pct, color, big, small) => `<div class="donut" style="--p:${pct}%;--c:${color}"><div><b>${big}</b><span>${small}</span></div></div>`;
    const row = (k, v) => `<li><span>${k}</span><span class="pill">${v}</span></li>`;
    $("#stats").innerHTML = `
      <div class="perf-blk">${donut(all.pct || 0, "var(--good)", all.pct == null ? "–" : all.pct + "%", "Correct")}
        <div><div class="c-lab">Your score</div><ul class="kv">${row("Total correct", all.right)}${row("Total incorrect", nInc)}${row("Flagged", questions.filter(q => Store.flagged(q.id)).length)}</ul></div></div>
      <div class="perf-blk">${donut(all.total ? Math.round(100 * all.used / all.total) : 0, "var(--accent)", all.total ? Math.round(100 * all.used / all.total) + "%" : "–", "Used")}
        <div><div class="c-lab">Qbank usage</div><ul class="kv">${row("Used questions", all.used)}${row("Unused questions", all.total - all.used)}${row("Total questions", all.total)}</ul></div></div>`;
    $("#perfTbl").innerHTML = `<thead><tr><th>Lecture</th><th class="num">Answered</th><th class="num">Correct</th><th class="bar-h">Accuracy</th></tr></thead><tbody>` +
      blocks.map(b => `<tr class="grp"><td colspan="4">${esc(b)}</td></tr>` + lectures.filter(l => l.block === b).map(l => {
        const sm = Store.summary(questions.filter(q => q.lecture_id === l.lecture_id).map(q => q.id));
        return `<tr><td>${esc(lecLabel(l.lecture))} <span class="muted">· Week ${l.week}</span></td><td class="num">${sm.used}/${sm.total}</td><td class="num">${sm.right}</td>
          <td class="bar-h">${sm.used ? `<span class="bar"><i style="width:${sm.pct}%" class="${sm.pct >= 70 ? "good" : sm.pct >= 50 ? "mid" : "bad"}"></i></span><b>${sm.pct}%</b>` : `<span class="muted">not started</span>`}</td></tr>`;
      }).join("")).join("") + `</tbody>`;
  }
  $("#exportBtn").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([Store.exportJSON()], { type: "application/json" }));
    a.download = `qbank-progress-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };
  $("#importFile").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { Store.importJSON(await f.text()); alert("Progress imported."); renderPerformance(); renderAll(); }
    catch (err) { alert("That file isn't a qbank backup."); }
  };
  $("#resetBtn").onclick = () => {
    if (confirm("Erase all saved answers, flags and test history in this browser? This can't be undone unless you exported a backup.")) { Store.reset(); location.reload(); }
  };

  renderResume(); renderAll(); route();
})();
