/* feedback.js: the Feedback page in the side menu. Sends one row to a write-only
   Supabase table (qbank_feedback). The key is the public "publishable" key; the
   table accepts new rows only and cannot be read back with it. A random id kept in
   this browser caps a sender at 20 notes a day. No names unless the sender types one. */
(function () {
  const URL = "https://cxooszmbqabouhlgtmmk.supabase.co/rest/v1/qbank_feedback";
  const KEY = "sb_publishable_rrvOvF_953x8g--mlIEYIw_dlRi9BUE";
  const $ = s => document.querySelector(s);
  const form = $("#fbForm"); if (!form) return;
  let player;
  try { player = localStorage.getItem("qb-fb-id"); if (!player) { player = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).slice(0, 36); localStorage.setItem("qb-fb-id", player); } }
  catch (e) { player = "anon-" + String(Math.random()).slice(2, 14); }
  const status = (t, k) => { const s = $("#fbStatus"); s.textContent = t; s.className = "fb-status " + (k || ""); };
  const kind = () => (form.querySelector("input[name=fbKind]:checked") || {}).value || "other";
  const sync = () => { $("#fbQRow").hidden = kind() !== "question"; $("#fbCount").textContent = $("#fbMsg").value.length + " / 2000"; };
  form.addEventListener("change", sync); $("#fbMsg").addEventListener("input", sync); sync();
  form.onsubmit = async e => {
    e.preventDefault();
    const message = $("#fbMsg").value.trim();
    if (message.length < 3) { status("Write a few words first.", "bad"); $("#fbMsg").focus(); return; }
    const body = { player, kind: kind(), message,
      question_id: kind() === "question" ? ($("#fbQ").value.trim() || null) : null,
      contact: $("#fbContact").value.trim() || null, page: location.pathname.slice(-200) };
    const btn = $("#fbSend"); btn.disabled = true; status("Sending...");
    try {
      const r = await fetch(URL, { method: "POST", headers: { apikey: KEY, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(r.status === 400 && /limit/.test(await r.text()) ? "limit" : "http");
      form.reset(); sync(); status("Thanks, your note was sent.", "ok");
    } catch (err) {
      status(err.message === "limit" ? "That's the most notes one browser can send in a day. Try again tomorrow." : "Couldn't send. Check your connection and try again.", "bad");
    } finally { btn.disabled = false; }
  };
})();
