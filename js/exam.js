/* exam.js — Examplify look-alike exam mode.
   phase: "exam" -> (submit flow overlays) -> "review". */
(async function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const { esc } = Explain;
  const L = k => String.fromCharCode(65 + k);
  const EYE = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="1.9"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const FLAG = '<svg viewBox="0 0 14 16" width="9" height="10"><path d="M2 15V1.5M2 2h9l-2 3.5L11 9H2" stroke="#fff" stroke-width="2" fill="#fff" stroke-linejoin="round"/></svg>';
  const HLC = { red: "#FF0000", yellow: "#F1F000", green: "#00FF2A", blue: "#009BFB", pink: "#FF0043", white: "#FFFFFF" };
  const SIZES = [0.85, 0.93, 1, 1.12, 1.25, 1.4, 1.6];

  let sess = Store.loadSession();
  if (new URLSearchParams(location.search).has("demo")) sess = await demoSession();
  if (!sess) { location.href = "index.html"; return; }
  if (sess.ui === "simple") { location.href = "quiz.html"; return; }
  const S = sess.state = Object.assign({ i: 0, answers: {}, elim: {}, flags: {}, notes: {}, fb: {}, hl: {}, secs: {}, phase: "exam", alarms: null, tutor: sess.tutor ?? !!Store.pref("exTutor"), checked: {} }, sess.state || {});
  // carry over state from the simple view (quiz.js uses the same keys)
  if (S.submitted && !Object.keys(S.checked).length) S.checked = S.submitted;
  if (S.finished && S.phase === "exam") S.phase = "review";
  const Q = await Data.byIds(sess.qids);
  if (!Q.length) { document.body.innerHTML = "<p style='padding:24px'>These questions are no longer available.</p>"; return; }
  const timed = sess.timeLimitSec > 0;
  const endAt = () => sess.startedAt + sess.timeLimitSec * 1000;
  if (!S.alarms) S.alarms = timed ? [{ id: 1, at: endAt() - 5 * 60e3, label: "5 minutes before end", fired: false, dismissed: false }] : [];
  const save = () => Store.saveSession(sess);
  let lastShown = -1;
  let shownAt = Date.now(), hlColor = Store.pref("exHl") || "yellow", hlMode = false, eraser = false, navFilter = "all";
  const review = () => S.phase === "review";
  const shown = q => review() || !!S.checked[q.id];          // show answer + explanation for this question

  // ---------- prefs ----------
  let sz = Store.pref("exSize") ?? 2;
  function applyPrefs() {
    document.documentElement.style.setProperty("--ex-scale", SIZES[sz]);
    $("#sizeRange").value = sz; $("#sizeRange").style.setProperty("--fill", (sz / 6 * 100) + "%");
    const dark = Store.pref("exDark");
    document.documentElement.dataset.exTheme = dark ? "dark" : "light";
    $("#darkItem").textContent = dark ? "Light Mode" : "Dark Mode";
    $(".q-hl").style.setProperty("--hlc", HLC[hlColor]);
    $$(".dot").forEach(d => d.classList.toggle("on", eraser ? d.dataset.c === "white" : d.dataset.c === hlColor));
  }
  $("#sizeRange").oninput = e => { sz = +e.target.value; Store.pref("exSize", sz); applyPrefs(); };

  // ---------- header ----------
  $("#exTitle").textContent = sess.title + "  |  PRACTICE CANDIDATE";
  const two = n => String(n).padStart(2, "0");
  const fmt = sec => { const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${two(h)}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`; };
  const fmtLong = sec => `${two(Math.floor(sec / 3600))}:${two(Math.floor(sec % 3600 / 60))}:${two(sec % 60)}`;
  function tick() {
    if (S.phase !== "exam" || !S.started) return;
    const sec = timed ? Math.max(0, Math.round((endAt() - Date.now()) / 1000)) : Math.round((Date.now() - sess.startedAt) / 1000);
    $("#clockVal").textContent = fmt(sec);
    $(".ck-lab").textContent = timed ? "TIME REMAINING" : "TIME ELAPSED";
    $("#kitTime").textContent = fmtLong(sec);
    $("#kitTime").nextElementSibling.textContent = timed ? "Time Remaining" : "Time Elapsed";
    let changed = false;
    for (const a of S.alarms) if (!a.fired && Date.now() >= a.at) { a.fired = true; changed = true; }
    if (changed) { save(); renderAlarms(); }
    $("#clock").classList.toggle("alarm", S.alarms.some(a => a.fired && !a.dismissed));
    if (timed && sec === 0) submitNow(true);
  }
  $("#clock").onclick = () => { if (!$("#clock").classList.contains("alarm")) return; S.alarms.forEach(a => { if (a.fired) a.dismissed = true; }); save(); renderAlarms(); tick(); };

  // ---------- alarms (Tool Kit > Tools) ----------
  function renderAlarms() {
    $("#alarmRows").innerHTML = S.alarms.filter(a => !(a.fired && a.dismissed)).map(a => {
      const left = Math.max(0, Math.round((a.at - Date.now()) / 1000));
      return a.fired
        ? `<div class="al-row firing"><b>00:00:00</b> <button class="al-x" data-dis="${a.id}">Dismiss Alarm</button></div>`
        : `<div class="al-row"><b>${fmtLong(left)}</b> ${esc(a.label)}<button class="al-x" data-del="${a.id}" aria-label="Delete alarm">✕</button></div>`;
    }).join("");
  }
  $("#alarmRows").onclick = e => {
    const d = e.target.dataset;
    if (d.dis) { S.alarms.find(a => a.id == d.dis).dismissed = true; }
    if (d.del) { S.alarms = S.alarms.filter(a => a.id != d.del); }
    save(); renderAlarms(); tick();
  };
  $("#addAlarm").onclick = () => { $("#addAlarmBox").hidden = !$("#addAlarmBox").hidden; if (!timed) $("#aaKind").value = "from"; };
  $("#aaCancel").onclick = () => { $("#addAlarmBox").hidden = true; };
  $("#aaSave").onclick = () => {
    const m = Math.max(1, +$("#aaMin").value || 5), kind = $("#aaKind").value;
    if (kind === "before" && !timed) { alert("This exam is untimed, so use “from this point in time”."); return; }
    const at = kind === "before" ? endAt() - m * 60e3 : Date.now() + m * 60e3;
    S.alarms.push({ id: Date.now(), at, label: kind === "before" ? `${m} min before end` : `${m} min from set`, fired: false, dismissed: false });
    $("#addAlarmBox").hidden = true; save(); renderAlarms();
  };
  setInterval(() => { if (!$("#kit").hidden && S.phase === "exam") renderAlarms(); }, 1000);

  // ---------- navigator ----------
  function visible() {
    return Q.map((q, k) => ({ q, k })).filter(({ q }) =>
      navFilter === "all" || (navFilter === "flagged" ? S.flags[q.id] : navFilter === "answered" ? S.answers[q.id] != null : S.answers[q.id] == null));
  }
  function renderNav() {
    $("#navList").innerHTML = visible().map(({ q, k }) => {
      let badge = "";
      if (shown(q) && (review() || S.answers[q.id] != null)) badge = S.answers[q.id] === q.answer ? `<span class="nv-res ok">✓</span>` : `<span class="nv-res bad">✕</span>`;
      return `<button class="nv-item ${S.answers[q.id] != null ? "ans" : ""} ${k === S.i ? "cur" : ""} ${S.seen && S.seen[q.id] ? "seen" : ""}" data-k="${k}" aria-label="Question ${k + 1}${S.answers[q.id] != null ? ", answered" : ""}${S.flags[q.id] ? ", flagged" : ""}" ${k === S.i ? 'aria-current="true"' : ""}>${k + 1}${S.flags[q.id] ? `<span class="nv-flag">${FLAG}</span>` : ""}${badge}</button>`;
    }).join("") || `<div class="nv-empty">None</div>`;
    $("#navList .cur")?.scrollIntoView({ block: "nearest" });
  }
  $("#navList").onclick = e => { const b = e.target.closest("[data-k]"); if (b) go(+b.dataset.k); };
  $("#navUp").onclick = () => $("#navList").scrollBy({ top: -190, behavior: "smooth" });
  $("#navDown").onclick = () => go(S.i + 1);
  $("#filterBtn").onclick = e => { e.stopPropagation(); $("#filterMenu").hidden = !$("#filterMenu").hidden; };
  $("#filterMenu").onchange = e => { navFilter = e.target.value; $("#filterBtn").firstChild.textContent = navFilter === "all" ? "FILTER " : navFilter.toUpperCase() + " "; renderNav(); };

  // ---------- question ----------
  function wrapRange(root, start, end, color) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let pos = 0, n; const todo = [];
    while ((n = w.nextNode())) { const len = n.nodeValue.length, a = Math.max(start, pos), b = Math.min(end, pos + len); if (a < b) todo.push([n, a - pos, b - pos]); pos += len; }
    for (const [node, a, b] of todo) { const r = document.createRange(); r.setStart(node, a); r.setEnd(node, b); const m = document.createElement("mark"); m.className = "hl hl-" + color; r.surroundContents(m); }
  }
  function offsetIn(root, node, off) {   // characters of text in root before (node, off)
    try { const r = document.createRange(); r.setStart(root, 0); r.setEnd(node, off); return r.toString().length; }
    catch (e) { return null; }
  }
  function paintHL(q) {
    for (const el of $$("#exMain [data-part]")) for (const h of (S.hl[q.id] || []).filter(h => h.part === el.dataset.part)) wrapRange(el, h.start, h.end, h.color);
  }

  function render() {
    const q = Q[S.i], pick = S.answers[q.id], elim = S.elim[q.id] || [];
    (S.seen = S.seen || {})[q.id] = true;
    const fvBox = $(".ex-q");
    fvBox.classList.toggle("fv", !!sess.fontVar);
    if (sess.fontVar) { const f = Explain.lecFont(q.lecture_id); fvBox.style.setProperty("--fv-family", f.family); fvBox.style.setProperty("--fv-size", f.size + "px"); }
    $("#qNum").firstChild.textContent = `Question ${S.i + 1} `;
    $("#flagBtn").setAttribute("aria-pressed", !!S.flags[q.id]);
    $("#flagBtn span").textContent = S.flags[q.id] ? "FLAGGED" : "FLAG QUESTION";
    $("#qStem").innerHTML = esc(q.stem).replace(/\n/g, "<br>");
    $("#qImg").innerHTML = q.stem_image ? `<button class="q-img" data-img="${esc(q.stem_image)}" data-cap="Question ${S.i + 1} image" title="Click to enlarge"><img src="${esc(q.stem_image)}" alt="Question image"></button>` : "";
    $("#qCur").textContent = pick != null ? `Currently Selected: ${L(pick)}` : `Answers A - ${L(q.choices.length - 1)}`;
    $("#qChoices").innerHTML = q.choices.map((c, k) => {
      let cls = k === pick ? "sel" : "", rv = "";
      if (elim.includes(k)) cls += " struck";
      if (shown(q)) {
        const mine = k === pick ? " sel" : "";
        if (k === q.answer) { cls = "is-correct" + mine; rv = `<span class="ch-rv" style="color:var(--good)" title="Correct answer${mine ? " (your answer)" : ""}">✓</span><span class="qf-sr">Correct answer</span>`; }
        else if (k === pick) { cls = "is-wrong" + mine; rv = `<span class="ch-rv" style="color:var(--bad)" title="Your answer (incorrect)">⊘</span><span class="qf-sr">Your answer, incorrect</span>`; }
        else cls = "";
        cls += " locked";
      }
      return `<div class="ch ${cls}" data-k="${k}" role="checkbox" tabindex="0" aria-checked="${k === pick}">
        <span class="ch-let">${L(k)}</span><span class="ch-txt" data-part="c${k}">${esc(c)}</span>${rv}
        <span class="ch-icon ch-check">${CHECK}</span>
        <button class="ch-icon ch-eye" data-eye="${k}" title="${elim.includes(k) ? "Restore" : "Strike out"} choice ${L(k)}" aria-label="${elim.includes(k) ? "Restore" : "Strike out"} choice ${L(k)}">${elim.includes(k) ? EYE_OFF : EYE}</button></div>`;
    }).join("");
    $("#tutorSw").checked = !!S.tutor;
    $("#tutorItem").textContent = S.tutor ? "Turn Off Tutor Mode" : "Turn On Tutor Mode";
    $("#qCheckRow").hidden = !(S.tutor && !review() && !S.checked[q.id]);
    $("#checkBtn").disabled = pick == null;
    $("#checkHint").textContent = pick == null ? "Select an answer, then check it." : "Checking locks this answer.";
    if (shown(q)) {
      $("#qRationale").hidden = false;
      $("#qRationale").innerHTML = `<h3>${pick == null ? "Not answered" : pick === q.answer ? "Correct" : "Incorrect"}<small>${q.mine ? "FROM YOUR NOTES" : q.source === "practice" ? "PRACTICE QUESTION" : "FROM THE LECTURE"}</small></h3>${Explain.evidenceHTML(q)}`;
    } else $("#qRationale").hidden = true;
    paintHL(q);
    $("#notesArea").value = S.notes[q.id] || "";
    $("#notesArea").placeholder = `Question #${S.i + 1} notes...`;
    $("#fbBox").checked = !!S.fb[q.id];
    $("#ftCount").textContent = `${S.i + 1} OF ${Q.length} QUESTIONS`;
    $("#prevBtn").disabled = S.i === 0;
    const last = S.i === Q.length - 1;
    $("#nextBtn").textContent = last ? (review() ? "Finish" : "Submit") : "Next";
    $("#nextBtn").classList.toggle("submit", last && !review());
    if (lastShown !== S.i) { $("#qScroll").scrollTop = 0; lastShown = S.i; }
    renderNav(); save();
  }

  function trackTime() { if (S.phase !== "exam") return; const q = Q[S.i]; S.secs[q.id] = (S.secs[q.id] || 0) + (Date.now() - shownAt) / 1000; shownAt = Date.now(); }
  function go(k) { if (k < 0 || k >= Q.length) return; trackTime(); S.i = k; render(); }

  // choose / strike
  $("#qChoices").addEventListener("click", e => {
    const q = Q[S.i];
    if (shown(q)) return;
    const eye = e.target.closest("[data-eye]");
    if (eye) { const k = +eye.dataset.eye, a = S.elim[q.id] = S.elim[q.id] || []; a.includes(k) ? a.splice(a.indexOf(k), 1) : a.push(k); return render(); }
    if (hlMode && !getSelection().isCollapsed) return;
    if (hlMode && e.target.closest("mark.hl")) return;
    const row = e.target.closest(".ch"); if (!row) return;
    const k = +row.dataset.k;
    if (S.answers[q.id] === k) delete S.answers[q.id]; else S.answers[q.id] = k;
    render();
  });
  $("#qChoices").addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && e.target.classList.contains("ch")) { e.preventDefault(); e.target.click(); } });

  // ---------- pre-exam details screen ----------
  function showStart() {
    $("#stTitle").textContent = sess.title;
    $("#stN").textContent = Q.length;
    $("#stTime").textContent = timed ? `${Math.round(sess.timeLimitSec / 60)} min` : "Untimed";
    $("#stTutor").checked = !!S.tutor;
    $("#ovStart").hidden = false;
  }
  $("#stGo").onclick = () => {
    S.tutor = $("#stTutor").checked; Store.pref("exTutor", S.tutor);
    // the clock starts when the student presses Start Exam
    sess.startedAt = Date.now(); S.started = true;
    if (timed) S.alarms.forEach(a => { if (a.id === 1) a.at = endAt() - 5 * 60e3; });
    $("#ovStart").hidden = true; shownAt = Date.now(); render(); tick();
  };

  // ---------- tutor mode (toggle any time during the exam) ----------
  function setTutor(on) { S.tutor = on; Store.pref("exTutor", on); render(); }
  $("#tutorSw").onchange = e => setTutor(e.target.checked);
  $("#checkBtn").onclick = () => {
    const q = Q[S.i]; if (S.answers[q.id] == null || S.checked[q.id]) return;
    trackTime();
    S.checked[q.id] = true;
    Store.record(q.id, S.answers[q.id], S.answers[q.id] === q.answer, "exam-tutor", S.secs[q.id]);
    render();
  };

  // ---------- highlighter ----------
  function setHlMode(on, er) {
    hlMode = on; eraser = !!er && on;
    document.body.classList.toggle("hl-on", on);
    $("#hlPen").setAttribute("aria-pressed", on && !eraser);
    $("#hlEraser").setAttribute("aria-pressed", on && eraser);
    applyPrefs();
  }
  $("#hlPen").onclick = () => setHlMode(!(hlMode && !eraser), false);
  $("#hlEraser").onclick = () => setHlMode(!(hlMode && eraser), true);
  $("#hlMore").onclick = () => { const h = $("#hlDots").hidden = !$("#hlDots").hidden; $("#hlMore").textContent = h ? "›" : "‹"; $("#hlMore").setAttribute("aria-expanded", !h); };
  const dotsHTML = list => list.map(c => `<button class="dot" data-c="${c}" title="${c === "white" ? "White (eraser)" : c[0].toUpperCase() + c.slice(1)}" aria-label="${c} highlighter"></button>`).join("");
  $("#hlDots").innerHTML = dotsHTML(["red", "yellow", "green", "blue", "pink"]);
  $("#kitDots").innerHTML = dotsHTML(["red", "yellow", "green", "blue", "pink", "white"]);
  document.addEventListener("click", e => {
    const d = e.target.closest(".dot"); if (!d) return;
    if (d.dataset.c === "white") return setHlMode(true, true);
    hlColor = d.dataset.c; Store.pref("exHl", hlColor); setHlMode(true, false);
  });
  $("#exMain").addEventListener("mouseup", () => {
    if (!hlMode || review()) return;
    const sel = getSelection(); if (!sel.rangeCount || sel.isCollapsed) return;
    const r = sel.getRangeAt(0), q = Q[S.i];
    for (const p of $$("#exMain [data-part]").filter(p => r.intersectsNode(p))) {
      const s = p.contains(r.startContainer) ? offsetIn(p, r.startContainer, r.startOffset) : 0;
      const en = p.contains(r.endContainer) ? offsetIn(p, r.endContainer, r.endOffset) : p.textContent.length;
      if (s == null || en == null || en <= s) continue;
      const list = S.hl[q.id] = S.hl[q.id] || [];
      if (eraser) {
        // drag the eraser: trim every highlight overlapping [s, en)
        S.hl[q.id] = list.flatMap(h => {
          if (h.part !== p.dataset.part || h.end <= s || h.start >= en) return [h];
          const out = [];
          if (h.start < s) out.push({ ...h, end: s });
          if (h.end > en) out.push({ ...h, start: en });
          return out;
        });
      } else list.push({ part: p.dataset.part, start: s, end: en, color: hlColor });
    }
    sel.removeAllRanges(); render();
  });
  $("#exMain").addEventListener("click", e => {
    const m = e.target.closest("mark.hl"); if (!m || !(hlMode && eraser) || review()) return;
    const part = m.closest("[data-part]"), q = Q[S.i], at = offsetIn(part, m.firstChild, 0);
    S.hl[q.id] = (S.hl[q.id] || []).filter(h => !(h.part === part.dataset.part && h.start <= at && at < h.end));
    render();
  });

  // ---------- flag / jump ----------
  $("#flagBtn").onclick = () => { const q = Q[S.i]; if (S.flags[q.id]) delete S.flags[q.id]; else S.flags[q.id] = true; Store.setFlag(q.id, !!S.flags[q.id]); render(); };
  $("#qNum").onclick = e => {
    e.stopPropagation();
    $("#qJump").innerHTML = Q.map((q, k) => `<button data-k="${k}">Question ${k + 1}<span class="qj-s">${S.answers[q.id] != null ? "Answered" : "Unanswered"}${S.flags[q.id] ? " · ⚑" : ""}</span></button>`).join("");
    $("#qJump").hidden = !$("#qJump").hidden;
  };
  $("#qJump").onclick = e => { const b = e.target.closest("[data-k]"); if (b) { $("#qJump").hidden = true; go(+b.dataset.k); } };

  // ---------- tool kit ----------
  let calcMounted = false;
  function kit(open) {
    $("#kit").hidden = !open; $("#tkBtn").setAttribute("aria-pressed", open);
    if (open) renderAlarms();
  }
  $("#tkBtn").onclick = () => kit($("#kit").hidden);
  $("#kitClose").onclick = () => kit(false);
  $(".kit-tabs").onclick = e => {
    const t = e.target.closest("[data-tab]"); if (!t) return;
    $$(".kit-tabs [data-tab]").forEach(b => b.setAttribute("aria-selected", b === t));
    $$(".kit-pane").forEach(p => p.hidden = p.dataset.pane !== t.dataset.tab);
    if (t.dataset.tab === "calc" && !calcMounted) { Calc.mount($("#calcHost")); calcMounted = true; }
    if (t.dataset.tab === "calc") $("#calcHost .cx-disp").focus();
  };
  $("#notesArea").oninput = e => { S.notes[Q[S.i].id] = e.target.value; save(); };
  $("#fbBox").onchange = e => { S.fb[Q[S.i].id] = e.target.checked; save(); };

  // pop-up windows
  function popup(id) {
    const w = $("#" + id); w.hidden = false;
    if (!w.style.left) { w.style.left = Math.max(10, (innerWidth - w.offsetWidth) / 2) + "px"; w.style.top = "90px"; }
    if (id === "labWin" && window.LabSheet) LabSheet.mount($("#labBody"));
  }
  $$(".exw").forEach(w => Drag.make(w, w.querySelector(".exw-h")));
  $$(".exw-x").forEach(x => x.onclick = () => { $("#" + x.dataset.close).hidden = true; });
  $("#docAttach").onclick = () => popup("labWin");
  $("#labHdr").onclick = () => popup("labWin");
  $("#docNotices").onclick = () => popup("noticeWin");

  // ---------- exam controls ----------
  $("#ctrlBtn").onclick = e => { e.stopPropagation(); const h = $("#ctrlMenu").hidden = !$("#ctrlMenu").hidden; $("#ctrlBtn").setAttribute("aria-expanded", !h); };
  document.addEventListener("click", e => {
    if (!e.target.closest("#ctrlMenu,#ctrlBtn")) { $("#ctrlMenu").hidden = true; $("#ctrlBtn").setAttribute("aria-expanded", false); }
    if (!e.target.closest("#filterMenu,#filterBtn")) $("#filterMenu").hidden = true;
    if (!e.target.closest("#qJump,#qNum")) $("#qJump").hidden = true;
  });
  $("#ctrlMenu").onclick = e => {
    const a = e.target.closest("[data-act]")?.dataset.act; if (!a) return;
    $("#ctrlMenu").hidden = true;
    if (a === "attach") popup("labWin");
    if (a === "hide") $("#ovHide").hidden = false;
    if (a === "suspend") $("#ovSuspend").hidden = false;
    if (a === "tutor") setTutor(!S.tutor);
    if (a === "simple") { trackTime(); sess.ui = "simple"; Store.pref("ui", "simple"); save(); location.href = "quiz.html"; }
    if (a === "dark") { Store.pref("exDark", !Store.pref("exDark")); applyPrefs(); }
    if (a === "submit") openSubmit();
  };
  $("#resumeBtn").onclick = () => { $("#ovHide").hidden = true; };
  $("#suspendNo").onclick = () => { $("#ovSuspend").hidden = true; };
  $("#suspendYes").onclick = () => { trackTime(); save(); location.href = "index.html"; };

  // ---------- submit flow ----------
  function openSubmit() {
    if (review()) return;
    $("#readyBox").checked = false; $("#subGo").disabled = true; $("#subHint").hidden = false; $("#ovSubmit").hidden = false;
  }
  $("#readyBox").onchange = e => { $("#subGo").disabled = !e.target.checked; $("#subHint").hidden = e.target.checked; };
  $("#subBack").onclick = () => { $("#ovSubmit").hidden = true; };
  $("#subGo").onclick = () => {
    $("#ovSubmit").hidden = true;
    if (Q.some(q => S.answers[q.id] == null)) $("#ovIncomplete").hidden = false; else submitNow(false);
  };
  $("#incBack").onclick = () => { $("#ovIncomplete").hidden = true; };
  $("#incClose").onclick = () => { $("#ovIncomplete").hidden = true; submitNow(false); };
  function submitNow() {
    if (S.phase !== "exam") return;
    trackTime();
    if (!sess.recorded) { for (const q of Q) if (S.answers[q.id] != null && !S.checked[q.id]) Store.record(q.id, S.answers[q.id], S.answers[q.id] === q.answer, "exam", S.secs[q.id]); sess.recorded = true; }
    S.phase = "results"; sess.finished = true; save();
    showResults();
  }
  function showResults() {
    $$(".ov").forEach(o => o.hidden = true);
    $("#prScore").textContent = Q.filter(q => S.answers[q.id] === q.answer).length;
    $("#prTotal").textContent = Q.length;
    $("#ovResults").hidden = false;
  }
  $("#toReview1").onclick = () => { $$(".ov").forEach(o => o.hidden = true); S.phase = "review"; S.i = 0; enter(); };

  // ---------- footer ----------
  $("#prevBtn").onclick = () => go(S.i - 1);
  $("#nextBtn").onclick = () => {
    if (S.i < Q.length - 1) return go(S.i + 1);
    if (review()) location.href = "index.html"; else openSubmit();
  };

  function enter() {
    document.body.dataset.phase = S.phase;
    if (review()) {
      const right = Q.filter(q => S.answers[q.id] === q.answer).length;
      $(".ck-lab").textContent = "REVIEW"; $("#clockVal").textContent = `${right} / ${Q.length} correct`;
      $("#flagBtn").hidden = false; setHlMode(false);
    }
    render();
  }

  // ---------- keyboard (Examplify: Ctrl/Cmd + > <, Ctrl/Cmd+Shift+letter, Ctrl/Cmd+H, +G, +N) ----------
  document.addEventListener("keydown", e => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === "." || e.key === ">")) { e.preventDefault(); return go(S.i + 1); }
    if (mod && (e.key === "," || e.key === "<")) { e.preventDefault(); return go(S.i - 1); }
    if (mod && e.shiftKey && /^[a-j]$/i.test(e.key) && !shown(Q[S.i])) {
      const k = e.key.toLowerCase().charCodeAt(0) - 97, q = Q[S.i];
      if (k < q.choices.length) { e.preventDefault(); S.answers[q.id] = k; render(); } return;
    }
    if (mod && e.key.toLowerCase() === "h") { e.preventDefault(); $("#ovHide").hidden = !$("#ovHide").hidden; return; }
    if (mod && e.key.toLowerCase() === "g") { e.preventDefault(); popup("labWin"); return; }
    if (mod && e.key.toLowerCase() === "n" && !e.shiftKey) { e.preventDefault(); popup("noticeWin"); return; }
    if (mod || e.target.closest("textarea,input,select,.cx")) return;
    if ($$(".ov").some(o => !o.hidden)) return;
    if (e.key === "ArrowRight") go(S.i + 1);
    else if (e.key === "ArrowLeft") go(S.i - 1);
    else return;
    e.preventDefault();
  });

  async function demoSession() {
    const lec = await Data.manifest();
    const qs = await Data.questions(lec.filter(l => l.block === "GI" && l.week === 1));
    // three questions from each lecture, interleaved, so lecture-to-lecture differences are visible
    const by = {}; for (const q of qs) (by[q.lecture_id] = by[q.lecture_id] || []).push(q);
    const lists = Object.values(by), pick = [];
    for (let r = 0; r < 3; r++) for (const l of lists) if (l[r]) pick.push(l[r]);
    const fontVar = new URLSearchParams(location.search).has("fontvar");
    return { id: "demo", ui: "examplify", title: "GI Week 1 Practice Exam", qids: pick.map(q => q.id), timeLimitSec: pick.length * 90, startedAt: Date.now(), fontVar, state: {} };
  }

  applyPrefs();
  if (S.phase === "results") { enter(); showResults(); } else { enter(); if (S.phase === "exam" && !S.started) showStart(); }
  tick(); setInterval(tick, 1000);
  Explain.wireViewer($("#exMain"));
  addEventListener("beforeunload", () => { trackTime(); save(); });
})();
