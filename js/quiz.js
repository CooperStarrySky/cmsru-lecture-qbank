/* quiz.js — QuizForge-style Tutor and Timed player. */
(async function () {
  const $ = s => document.querySelector(s);
  const { esc } = Explain;
  const sess = Store.loadSession();
  if (!sess) { location.href = "index.html"; return; }
  if ((sess.ui || "examplify") !== "simple") { location.href = "exam.html"; return; }
  // shared session state with exam.js: answers, elim, checked (tutor-checked), secs, i, phase/finished, tutor
  const S = sess.state = Object.assign({ i: 0, answers: {}, elim: {}, checked: {}, secs: {}, finished: false }, sess.state || {});
  if (S.checked && !Object.keys(S.checked).length) S.checked = S.checked;
  if (S.phase && S.phase !== "exam") S.finished = true;
  if (S.tutor == null) S.tutor = !!sess.tutor;
  S.started = true;
  const Q = await Data.byIds(sess.qids);
  if (!Q.length) { $("#main").innerHTML = `<div class="qf-empty">These questions are no longer available.</div>`; return; }
  $("#title").textContent = sess.title;
  let shownAt = Date.now(), lastShown = -1;
  const save = () => Store.saveSession(sess);

  // font size
  let cs = +(Store.pref("cscale") || 1);
  const setCs = v => { cs = Math.min(1.4, Math.max(0.85, +v.toFixed(2))); document.documentElement.style.setProperty("--cscale", cs); Store.pref("cscale", cs); };
  $("#fontDn").onclick = () => setCs(cs - 0.1);
  $("#fontUp").onclick = () => setCs(cs + 0.1);

  const reviewing = () => S.finished || (S.tutor && S.checked[Q[S.i].id]);

  function tick() {
    const q = Q[S.i];
    if (!S.finished && !S.checked[q.id]) {
      S.secs[q.id] = (S.secs[q.id] || 0) + (Date.now() - shownAt) / 1000;
    }
    shownAt = Date.now();
  }

  function rail() {
    $("#rail").innerHTML = Q.map((q, k) => {
      let cls = "";
      const showRes = S.finished || (S.tutor && S.checked[q.id]);
      if (showRes) cls = S.answers[q.id] === q.answer ? "is-correct" : "is-wrong";
      else if (S.answers[q.id] != null) cls = "is-answered";
      if (Store.flagged(q.id)) cls += " is-flagged";
      return `<button class="qf-qchip ${cls}" data-k="${k}" ${k === S.i ? 'aria-current="true"' : ""}>${k + 1}</button>`;
    }).join("");
  }

  function render() {
    const q = Q[S.i];
    const rev = reviewing();
    const main = $("#main");
    main.classList.toggle("fv", !!sess.fontVar);
    if (sess.fontVar) { const f = Explain.lecFont(q.lecture_id); main.style.setProperty("--fv-family", f.family); main.style.setProperty("--fv-size", f.size + "px"); }
    const pick = S.answers[q.id];
    const elim = S.elim[q.id] || [];
    $("#tutorBtn").textContent = S.tutor ? "Tutor: on" : "Tutor: off"; $("#tutorBtn").hidden = S.finished;
    $("#pos").textContent = `${S.i + 1} of ${Q.length}`;
    $("#flagBtn").setAttribute("aria-pressed", Store.flagged(q.id));
    $("#flagBtn").classList.toggle("on", Store.flagged(q.id));
    const choices = q.choices.map((c, k) => {
      let cls = "", tag = "";
      if (rev) {
        if (k === q.answer) { cls = "is-correct"; tag = "Correct answer"; }
        else if (k === pick) { cls = "is-wrong"; tag = "Your answer"; }
      }
      if (elim.includes(k)) cls += " is-eliminated";
      return `<div class="qf-choice ${cls}" role="radio" tabindex="0" data-k="${k}" aria-checked="${k === pick}" ${rev ? 'aria-disabled="true"' : ""}>
        <span class="qf-choice__key">${String.fromCharCode(65 + k)}</span>
        <span class="qf-choice__text">${esc(c)}</span>
        ${tag ? `<span class="qf-choice__tag">${tag}</span>` : ""}</div>`;
    }).join("");
    let foot;
    if (rev) {
      const right = pick === q.answer;
      foot = `<div class="qf-explain"><div class="qf-explain__label">${pick == null ? "Not answered" : right ? "✓ Correct" : "✗ Incorrect"} · ${q.mine ? "From your notes" : q.source === "practice" ? "Practice question" : "From the lecture"}</div>${Explain.evidenceHTML(q)}</div>
        <div class="qf-qnav">${S.i > 0 ? `<button class="qf-btn" id="prev">Previous</button>` : ""}${S.i < Q.length - 1 ? `<button class="qf-btn qf-btn--primary" id="next">Next</button>` : (S.finished ? `<a class="qf-btn qf-btn--primary" href="index.html">Done</a>` : `<button class="qf-btn qf-btn--primary" id="finish">See score</button>`)}</div>`;
    } else {
      foot = `<div class="qf-qnav">${S.i > 0 ? `<button class="qf-btn" id="prev">Previous</button>` : ""}
        ${S.tutor ? `<button class="qf-btn qf-btn--primary" id="submit" ${pick == null ? "disabled" : ""}>Submit</button>`
          : (S.i < Q.length - 1 ? `<button class="qf-btn qf-btn--primary" id="next">Next</button>` : `<button class="qf-btn qf-btn--primary" id="finish">Finish and review</button>`)}</div>`;
    }
    const img = q.stem_image ? `<button class="qf-figure" data-img="${esc(q.stem_image)}" data-cap="Question image" style="max-width:520px;margin-bottom:14px"><img src="${esc(q.stem_image)}" alt="Question image"></button>` : "";
    $("#main").innerHTML = `<div class="qmeta">${esc(q.lecture)}</div>${img}<div class="qf-stem">${Explain.stemHTML(q)}</div>
      <div class="qf-choices" role="radiogroup">${choices}</div>${foot}`;
    rail(); save();
    if (lastShown !== S.i) { window.scrollTo(0, 0); lastShown = S.i; }
  }

  function choose(k) {
    const q = Q[S.i]; if (reviewing()) return;
    S.answers[q.id] = k;
    S.elim[q.id] = (S.elim[q.id] || []).filter(x => x !== k);
    render();
  }
  function submit() {
    const q = Q[S.i]; if (S.answers[q.id] == null) return;
    tick(); S.checked[q.id] = true;
    Store.record(q.id, S.answers[q.id], S.answers[q.id] === q.answer, "tutor", S.secs[q.id]);
    render();
  }
  function go(k) { if (k < 0 || k >= Q.length) return; tick(); S.i = k; render(); }
  function finish() {
    if (!S.finished && !S.tutor) {
      const left = Q.filter(q => S.answers[q.id] == null).length;
      if (left && !confirm(`${left} question${left > 1 ? "s are" : " is"} unanswered. Finish anyway?`)) return;
    }
    tick();
    if (!sess.recorded) {
      for (const q of Q) if (S.answers[q.id] != null && !S.checked[q.id]) Store.record(q.id, S.answers[q.id], S.answers[q.id] === q.answer, sess.timeLimitSec ? "timed" : "untimed", S.secs[q.id]);
      sess.recorded = true;
    }
    S.finished = true; S.phase = "review"; sess.finished = true;
    const right = Q.filter(q => S.answers[q.id] === q.answer).length;
    $("#results").innerHTML = `<div class="qf-results"><span class="qf-results__score">${right} / ${Q.length} · ${Math.round(100 * right / Q.length)}%</span>
      <span class="qf-muted">Review each question below. Your answers are saved.</span><span class="qf-spacer"></span><a class="qf-btn qf-btn--primary qf-btn--sm" href="index.html">New session</a></div>`;
    $("#clock").hidden = true;
    S.i = 0; render();
  }

  $("#main").addEventListener("click", e => {
    const c = e.target.closest(".qf-choice"); if (c) return choose(+c.dataset.k);
    const id = e.target.id;
    if (id === "submit") submit(); else if (id === "next") go(S.i + 1); else if (id === "prev") go(S.i - 1); else if (id === "finish") finish();
  });
  $("#main").addEventListener("contextmenu", e => {
    const c = e.target.closest(".qf-choice"); if (!c || reviewing()) return;
    e.preventDefault();
    const q = Q[S.i], k = +c.dataset.k, a = S.elim[q.id] = S.elim[q.id] || [];
    a.includes(k) ? a.splice(a.indexOf(k), 1) : a.push(k);
    if (S.answers[q.id] === k) delete S.answers[q.id];
    render();
  });
  $("#rail").onclick = e => { const b = e.target.closest("[data-k]"); if (b) go(+b.dataset.k); };
  $("#labBtn").onclick = () => { $("#labDlg").showModal(); LabSheet.mount($("#labBody")); };
  $("#flagBtn").onclick = () => { const q = Q[S.i]; Store.setFlag(q.id, !Store.flagged(q.id)); render(); };
  $("#viewBtn").onclick = () => { tick(); sess.ui = "examplify"; Store.pref("ui", "examplify"); S.started = true; if (S.finished) S.phase = "review"; save(); location.href = "exam.html"; };
  $("#tutorBtn").onclick = () => { S.tutor = !S.tutor; render(); };
  $("#endBtn").onclick = () => { S.finished ? (location.href = "index.html") : finish(); };
  Explain.wireViewer($("#main"));

  document.addEventListener("keydown", e => {
    if (e.target.matches("input,textarea") || e.metaKey || e.ctrlKey) return;
    const q = Q[S.i], k = e.key.toLowerCase();
    if (k >= "a" && k <= "j" && k.charCodeAt(0) - 97 < q.choices.length) choose(k.charCodeAt(0) - 97);
    else if (k >= "1" && k <= "9" && +k <= q.choices.length) choose(+k - 1);
    else if (k === "arrowright") go(S.i + 1);
    else if (k === "arrowleft") go(S.i - 1);
    else if (k === "f") $("#flagBtn").click();
    else if (k === "enter") {
      if (S.tutor && !reviewing()) submit();
      else if (S.i < Q.length - 1) go(S.i + 1);
      else if (!S.finished) finish();
    } else return;
    e.preventDefault();
  });

  // timed clock
  if (sess.timeLimitSec && !S.finished) {
    $("#clock").hidden = false;
    const end = sess.startedAt + sess.timeLimitSec * 1000;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      $("#clock").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      $("#clock").classList.toggle("low", left < 60);
      if (!left) { clearInterval(t); alert("Time is up."); S.finished || finish(); }
    }, 500);
  }
  if (S.finished) { S.finished = false; finish(); } else render();
})();
