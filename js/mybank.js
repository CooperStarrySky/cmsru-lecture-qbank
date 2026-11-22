/* mybank.js — "My Questions": quizzes students make from their own notes with any AI.
   Everything lives in this browser (IndexedDB). Nothing is uploaded.

   MyBank.prompt(opts)          -> prompt text to give another AI
   MyBank.parse(text)           -> {quiz?, questions[], skipped[], errors[]}  (lenient)
   MyBank.save(...) / list() / get(id) / remove(id) / exportFile(id)
   MyBank.lectures() / questions() -> shaped like the public bank for Create Test + players */
(function () {
  const DB = "qbank-mine", VER = 1;
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      let r;
      try { r = indexedDB.open(DB, VER); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("quizzes")) d.createObjectStore("quizzes", { keyPath: "id" });
        if (!d.objectStoreNames.contains("images")) d.createObjectStore("images");
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), s = t.objectStore(store);
      let out;
      Promise.resolve(fn(s)).then(v => { out = v; });
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  // ---------------- prompt ----------------
  function prompt({ mode = "existing", count = 10, title = "" } = {}) {
    const extract = mode === "existing";
    const task = extract
      ? `Find every practice question that ALREADY EXISTS in the material I attached: questions printed on slides ("Question", "Check your understanding", "Practice question", polls), in the lecture notes, or asked out loud in the transcript with the answer given.
- Copy each question's stem and answer choices exactly. Do not invent questions, reword stems or add answer choices.
- Only include a question if the material itself shows the correct answer. If it does not, leave it out.
- If there are none, return "questions": [] and explain in "message".`
      : `Write ${count} NEW one-best-answer questions in the style of NBME / USMLE Step 1 that test the most important ideas in the material I attached.
- Clinical or experimental vignette stems where it fits, 5 answer choices (A–E), exactly one best answer.
- Test understanding and application, not trivia. Spread the questions across the whole lecture.
- Every fact needed to answer must come from the attached material. If you rely on standard medical knowledge that is not in the material, say so in the explanation.
- Distractors must be plausible and clearly wrong according to the material.`;
    return `You are helping a medical student turn their own lecture material into a practice quiz for a study website.

TASK
${task}

EXPLANATIONS
- "explanation": 2–6 short paragraphs separated by a blank line. Start with one bold sentence (**like this**) saying why the answer is right, then one short paragraph per wrong choice in the form: Choice text: false. Why.
- "quotes": 1–3 sentences copied WORD FOR WORD from the attached material that prove the answer. Do not paraphrase inside quotes. "where" says where each quote is: "Slide 12", "Notes p. 4", or a transcript time like "00:14:32".
- "slides": the slide numbers that best show the answer. Slide number = the PAGE NUMBER of the attached PDF (first page is 1), not any number printed on the slide.

OUTPUT FORMAT
Reply with ONLY one JSON code block, nothing before or after it. Use exactly this shape:

\`\`\`json
{
  "qbank": 1,
  "title": "${title ? title.replace(/"/g, "'") : "Short lecture name"}",
  "message": "",
  "questions": [
    {
      "type": "${extract ? "existing" : "new"}",
      "found_at": "${extract ? "Slide 18" : ""}",
      "stem": "A 54-year-old man ... Which of the following is the most likely ...?",
      "choices": ["first choice", "second choice", "third choice", "fourth choice", "fifth choice"],
      "answer": "C",
      "explanation": "**Why C is right in one sentence.**\\n\\nFirst choice: false. Why.\\n\\nSecond choice: false. Why.",
      "quotes": [{ "text": "Exact sentence from the material.", "where": "Slide 18" }],
      "slides": [18, 19]
    }
  ]
}
\`\`\`

RULES FOR THE JSON
- "answer" is the letter of the correct choice (A = first choice).
- Do not put letters like "A." in front of the choice text.
- Plain text only in stems and choices (no HTML, no Markdown, no images).
- Use straight double quotes and escape any double quote inside text as \\". No trailing commas.
- If the reply would be too long, stop after a complete question, close the JSON properly, and put "continue" in "message". I will ask you to continue, and you will send the next questions in the same format.`;
  }

  // ---------------- parse + validate (lenient) ----------------
  const LETTERS = "ABCDEFGHIJ";
  function extractJSON(text) {
    let s = String(text || "").trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    const a = Math.min(...["{", "["].map(c => { const i = s.indexOf(c); return i < 0 ? Infinity : i; }));
    const b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (a === Infinity || b < a) throw new Error("I couldn't find any JSON in that text. Paste the AI's whole reply, including the code block.");
    s = s.slice(a, b + 1);
    const tries = [
      x => x,
      x => x.replace(/,\s*([}\]])/g, "$1"),                                    // trailing commas
      x => x.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/,\s*([}\]])/g, "$1"), // curly quotes
    ];
    let last;
    for (const f of tries) { try { return JSON.parse(f(s)); } catch (e) { last = e; } }
    throw new Error("The JSON has a formatting error (" + last.message.replace(/^JSON\.parse: /, "") + "). Use “Copy a fix-up message” and send it to your AI.");
  }
  const clean = s => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\r/g, "").trim();
  function checkQuestion(q, i) {
    const n = `Question ${i + 1}`;
    if (!q || typeof q !== "object") return { err: `${n}: not a question object` };
    const stem = clean(q.stem || q.question || q.text);
    if (!stem) return { err: `${n}: missing "stem"` };
    let choices = q.choices || q.options || q.answers;
    if (choices && !Array.isArray(choices) && typeof choices === "object") choices = Object.values(choices);
    if (!Array.isArray(choices)) return { err: `${n}: "choices" must be a list` };
    choices = choices.map(c => clean(typeof c === "object" ? (c.text || c.choice || "") : c).replace(/^\(?[A-Ja-j][.)]\s+/, ""));
    if (choices.length < 2 || choices.length > 10) return { err: `${n}: needs 2–10 choices (has ${choices.length})` };
    if (choices.some(c => !c)) return { err: `${n}: has an empty answer choice` };
    if (new Set(choices.map(c => c.toLowerCase())).size !== choices.length) return { err: `${n}: two answer choices are identical` };
    let ans = q.answer ?? q.correct ?? q.correct_answer;
    let k = -1;
    if (typeof ans === "number") k = ans >= 0 && ans < choices.length ? ans : -1;
    else if (typeof ans === "string") {
      const t = ans.trim().replace(/[.)]$/, "");
      if (/^[A-Ja-j]$/.test(t)) k = LETTERS.indexOf(t.toUpperCase());
      else k = choices.findIndex(c => c.toLowerCase() === clean(ans).toLowerCase());
    }
    if (k < 0 || k >= choices.length) return { err: `${n}: "answer" must be a letter A–${LETTERS[choices.length - 1]} that matches a choice` };
    const quotes = (Array.isArray(q.quotes) ? q.quotes : []).map(x => typeof x === "string" ? { text: clean(x), where: "" } : { text: clean(x.text || x.quote), where: clean(x.where || x.source || ""), ...(typeof x.found === "boolean" ? { found: x.found } : {}) }).filter(x => x.text);
    const slides = (Array.isArray(q.slides) ? q.slides : []).map(x => parseInt(x, 10)).filter(x => x > 0 && x < 2000);
    const warn = [];
    if (!clean(q.explanation)) warn.push(`${n}: no explanation`);
    if (!quotes.length) warn.push(`${n}: no quotes from the material`);
    return {
      q: {
        type: q.type === "existing" ? "existing" : "new",
        found_at: clean(q.found_at || ""),
        stem, choices, answer: k,
        explanation: String(q.explanation || "").replace(/\r/g, "").trim(),
        quotes, slides: [...new Set(slides)].slice(0, 4),
      }, warn,
    };
  }
  function parse(text) {
    const data = extractJSON(text);
    const list = Array.isArray(data) ? data : (data.questions || data.quiz || []);
    if (!Array.isArray(list)) throw new Error('The JSON has no "questions" list.');
    const out = { title: clean(Array.isArray(data) ? "" : data.title), message: clean(Array.isArray(data) ? "" : data.message), questions: [], skipped: [], warnings: [], images: (!Array.isArray(data) && data.images) || null };
    list.forEach((q, i) => {
      const r = checkQuestion(q, i);
      if (r.err) out.skipped.push(r.err); else { out.questions.push(r.q); out.warnings.push(...r.warn); }
    });
    return out;
  }
  function fixupMessage(problems) {
    return `Your last reply could not be fully imported by the study website. Please fix these problems and send the WHOLE corrected JSON again, in the same format, as one json code block with nothing else:\n\n- ${problems.join("\n- ")}`;
  }

  // ---------------- quote checking against PDF text ----------------
  const norm = s => String(s).toLowerCase().normalize("NFKC").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^a-z0-9%'"\-+./]+/g, " ").replace(/\s+/g, " ").trim();
  function verify(questions, pageTexts) {
    if (!pageTexts) return;
    const all = norm(pageTexts.join(" "));
    for (const q of questions) for (const x of q.quotes) {
      const t = norm(x.text).replace(/[.]$/, "");
      x.found = t.length > 12 && all.includes(t);
    }
  }

  // ---------------- storage ----------------
  const newId = () => "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  async function list() {
    try { return (await tx("quizzes", "readonly", s => req(s.getAll()))).sort((a, b) => b.created - a.created); }
    catch (e) { return []; }
  }
  const get = id => tx("quizzes", "readonly", s => req(s.get(id)));
  // save a parsed batch, as a new quiz or appended to an existing one.
  // images: {pageNumber: Blob}; pdfMeta: {name, pages}
  async function save({ quizId, title, mode, parsed, images, pdfName }) {
    const now = Date.now();
    let quiz = quizId ? await get(quizId) : null;
    if (!quiz) quiz = { id: newId(), title: title || parsed.title || "My quiz", created: now, mode, pdfName: "", pages: [], questions: [], nextNum: 1 };
    if (title) quiz.title = title;
    for (const q of parsed.questions) { q.num = quiz.nextNum++; quiz.questions.push(q); }
    if (pdfName) quiz.pdfName = pdfName;
    quiz.updated = now;
    const pages = Object.keys(images || {}).map(Number);
    quiz.pages = [...new Set([...(quiz.pages || []), ...pages])].sort((a, b) => a - b);
    await tx("images", "readwrite", s => { for (const p of pages) s.put(images[p], `${quiz.id}:${p}`); });
    await tx("quizzes", "readwrite", s => s.put(quiz));
    return quiz;
  }
  async function rename(id, title) { const q = await get(id); if (q) { q.title = title; await tx("quizzes", "readwrite", s => s.put(q)); } }
  async function remove(id) {
    const q = await get(id);
    await tx("images", "readwrite", s => { for (const p of (q?.pages || [])) s.delete(`${id}:${p}`); });
    await tx("quizzes", "readwrite", s => s.delete(id));
  }
  const blobURLs = {};
  async function imageURL(id, page) {
    const k = `${id}:${page}`;
    if (blobURLs[k]) return blobURLs[k];
    const b = await tx("images", "readonly", s => req(s.get(k)));
    return b ? (blobURLs[k] = URL.createObjectURL(b)) : null;
  }
  const toDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
  async function exportFile(id) {
    const q = await get(id); if (!q) return;
    const images = {};
    for (const p of q.pages || []) { const b = await tx("images", "readonly", s => req(s.get(`${id}:${p}`))); if (b) images[p] = await toDataURL(b); }
    const out = { qbank: 1, title: q.title, message: "", shared_from: "CMSRU Lecture Qbank", questions: q.questions.map(x => ({ type: x.type, found_at: x.found_at, stem: x.stem, choices: x.choices, answer: LETTERS[x.answer], explanation: x.explanation, quotes: x.quotes.map(z => ({ text: z.text, where: z.where, ...(typeof z.found === "boolean" ? { found: z.found } : {}) })), slides: x.slides })), images };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" }));
    a.download = q.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) + ".qbank.json";
    a.click();
  }
  async function dataURLsToBlobs(images) {
    const out = {};
    for (const [p, u] of Object.entries(images || {})) { try { out[+p] = await (await fetch(u)).blob(); } catch (e) {} }
    return out;
  }

  // ---------------- shape for the rest of the site ----------------
  const BLOCK = "My Questions";
  async function lectures() {
    return (await list()).map(q => ({ lecture_id: "my-" + q.id, block: BLOCK, week: 0, lecture: q.title, n: q.questions.length, mine: true, released: true }));
  }
  async function toQuestions(quiz) {
    const lid = "my-" + quiz.id, out = [];
    for (const x of quiz.questions) {
      const ev = x.quotes.map(z => ({ type: "mine", quote: z.text, where: z.where, found: z.found }));
      for (const p of x.slides) { const u = await imageURL(quiz.id, p); ev.push({ type: "slide", slide: p, image: u || "" }); }
      out.push({
        id: `${lid}-q${String(x.num).padStart(2, "0")}`, lecture_id: lid, block: BLOCK, week: 0, lecture: quiz.title, mine: true,
        source: x.type === "existing" ? "mine" : "ai", source_ref: x.found_at,
        stem: x.stem, choices: x.choices, answer: x.answer, evidence: ev, note: x.explanation,
      });
    }
    return out;
  }
  async function questions(ids) {
    const qs = await list(), out = [];
    for (const q of qs) if (!ids || ids.has("my-" + q.id)) out.push(...await toQuestions(q));
    return out;
  }

  window.MyBank = { BLOCK, prompt, parse, fixupMessage, verify, list, get, save, rename, remove, exportFile, dataURLsToBlobs, lectures, questions, LETTERS };
})();
