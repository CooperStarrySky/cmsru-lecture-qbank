/* data.js — loads the manifest and lecture files. Only released weeks are
   shown unless the page URL has ?preview=1 (for contributors checking drafts). */
(function () {
  const SOURCE_LABELS = {
    slide: "Lecture slides",
    notes: "Lecture notes",
    formative: "Formative quizzes",
    said: "Said in lecture",
    practice: "Practice questions (written)",
  };
  // sources that only exist in a student's own quizzes (shown only when they have some)
  const MY_SOURCE_LABELS = {
    mine: "From my notes",
    ai: "AI-written from my notes",
  };
  const preview = new URLSearchParams(location.search).has("preview");
  const cache = {};

  async function getJSON(url) {
    const r = await fetch(url, { cache: "no-cache" });
    if (!r.ok) throw new Error(url + " " + r.status);
    return r.json();
  }

  const Data = {
    SOURCE_LABELS,
    MY_SOURCE_LABELS,
    preview,
    async manifest() {
      const m = await getJSON("data/manifest.json");
      return m.lectures.filter(l => preview || l.released);
    },
    async lecture(entry) {
      if (!cache[entry.file]) cache[entry.file] = getJSON(entry.file);
      return cache[entry.file];
    },
    // returns flat question list, each with lecture meta attached
    async questions(entries) {
      const lecs = await Promise.all(entries.map(e => Data.lecture(e)));
      const out = [];
      for (const L of lecs) for (const q of L.questions)
        out.push(Object.assign({ lecture_id: L.lecture_id, block: L.block, week: L.week, lecture: L.lecture }, q));
      return out;
    },
    async byIds(qids) {
      const m = await getJSON("data/manifest.json");      // a session may include since-hidden weeks
      const want = new Set(qids.map(id => id.replace(/-q\d+$/, "")));
      const all = await Data.questions(m.lectures.filter(l => want.has(l.lecture_id)));
      // the student's own quizzes ("my-..." ids) live in this browser
      if (window.MyBank && [...want].some(id => id.startsWith("my-"))) {
        try { all.push(...await MyBank.questions(want)); } catch (e) {}
      }
      const map = Object.fromEntries(all.map(q => [q.id, q]));
      return qids.map(id => map[id]).filter(Boolean);
    },
  };
  window.Data = Data;
})();
