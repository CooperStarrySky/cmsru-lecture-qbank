/* store.js — progress saved in this browser (localStorage), plus the
   current session. Every read/write is wrapped: private windows or blocked
   storage just mean progress isn't kept. */
(function () {
  const KEY = "qbank.v1";
  const SKEY = "qbank.session";
  const HKEY = "qbank.history";

  function read(k, fallback) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function db() {
    const d = read(KEY, null) || {};
    d.attempts = d.attempts || {};   // qid -> [{t, choice, correct, mode, secs}]
    d.flags = d.flags || {};         // qid -> true
    d.prefs = d.prefs || {};
    return d;
  }

  const Store = {
    db,
    record(qid, choice, correct, mode, secs) {
      const d = db();
      (d.attempts[qid] = d.attempts[qid] || []).push({ t: Date.now(), choice, correct, mode, secs: Math.round(secs || 0) });
      write(KEY, d);
    },
    setFlag(qid, on) {
      const d = db();
      if (on) d.flags[qid] = true; else delete d.flags[qid];
      write(KEY, d);
    },
    status(qid) {            // "unused" | "correct" | "incorrect" (last attempt)
      const a = db().attempts[qid];
      if (!a || !a.length) return "unused";
      return a[a.length - 1].correct ? "correct" : "incorrect";
    },
    everWrong(qid) { return (db().attempts[qid] || []).some(x => !x.correct); },
    flagged(qid) { return !!db().flags[qid]; },
    pref(k, v) {
      const d = db();
      if (v === undefined) return d.prefs[k];
      d.prefs[k] = v; write(KEY, d);
    },
    summary(qids) {
      let used = 0, right = 0;
      for (const id of qids) {
        const s = Store.status(id);
        if (s !== "unused") { used++; if (s === "correct") right++; }
      }
      return { total: qids.length, used, right, pct: used ? Math.round(100 * right / used) : null };
    },
    exportJSON() { return JSON.stringify(db(), null, 1); },
    importJSON(text) {
      const inc = JSON.parse(text);
      const d = db();
      for (const [q, arr] of Object.entries(inc.attempts || {})) {
        const have = new Set((d.attempts[q] || []).map(x => x.t));
        d.attempts[q] = (d.attempts[q] || []).concat(arr.filter(x => !have.has(x.t))).sort((a, b) => a.t - b.t);
      }
      Object.assign(d.flags, inc.flags || {});
      return write(KEY, d);
    },
    reset() { try { localStorage.removeItem(KEY); localStorage.removeItem(HKEY); localStorage.removeItem(SKEY); } catch (e) {} },

    // sessions: {id, ui, tutor, title, qids, timeLimitSec, startedAt, state}
    saveSession(s) {
      write(SKEY, s);
      // keep a copy in the test history so Previous Tests can show it and reopen it for review
      if (String(s.id).startsWith("demo")) return;
      try {
        const h = read(HKEY, []);
        const i = h.findIndex(x => x.id === s.id);
        if (i >= 0) h[i] = s; else h.unshift(s);
        write(HKEY, h.slice(0, 60));
      } catch (e) {}
    },
    history() { return read(HKEY, []); },
    openFromHistory(id) { const s = read(HKEY, []).find(x => x.id === id); if (s) write(SKEY, s); return s; },
    deleteFromHistory(id) { write(HKEY, read(HKEY, []).filter(x => x.id !== id)); const c = read(SKEY, null); if (c && c.id === id) Store.clearSession(); },
    loadSession() { return read(SKEY, null); },
    clearSession() { try { localStorage.removeItem(SKEY); } catch (e) {} },
  };
  window.Store = Store;
})();
