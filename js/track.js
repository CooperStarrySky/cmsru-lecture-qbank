/* track.js — anonymous visit counter. Sends one row per page load to the qbank's
   own Supabase project: which page, and a random id kept in this browser (no names,
   no answers). The key below is the public "publishable" key; the table only
   accepts new rows and can't be read back with it. Off on localhost unless ?track. */
(function () {
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (local && !new URLSearchParams(location.search).has("track")) return;
  const page = /exam\.html$/.test(location.pathname) ? "exam" : /quiz\.html$/.test(location.pathname) ? "quiz" : "home";
  let device = null;
  try {
    device = localStorage.getItem("qb-device");
    if (!device) { device = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()).slice(0, 36); localStorage.setItem("qb-device", device); }
  } catch (e) { device = "anon-" + String(Math.random()).slice(2, 12); }
  fetch("https://afhyeyqyvbsytdhbvzes.supabase.co/rest/v1/visits", {
    method: "POST", keepalive: true,
    headers: { "apikey": "sb_publishable_hQSYc2eTkVQ56s0ElPVhrA_yxToXefl", "Content-Type": "application/json", "Prefer": "return=minimal" },
    body: JSON.stringify({ page, device }),
  }).catch(() => {});
})();
