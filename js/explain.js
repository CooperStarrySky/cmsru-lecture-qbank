/* explain.js — renders a question's evidence: verbatim quotes and slides.
   Shared by quiz.html (tutor/timed) and exam.html review. */
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = { transcript: "Said in lecture", notes: "Lecture notes", slide: "Slide" };

  // "02 Salivary Gastric..." -> "Lecture 02: Salivary Gastric..."; labs and others stay as written
  function lecName(name, q) {
    if (q && q.mine) return String(name || "");
    const m = String(name || "").match(/^(\d+)\s+(.*)$/);
    const base = m ? `Lecture ${m[1]}: ${m[2]}` : String(name || "");
    return q && q.block ? `${base} (${q.block} Week ${q.week})` : base;
  }

  // light Markdown for notes: **bold**, *italic*, blank-line paragraphs, "- " lists.
  // A paragraph like "Choice text: true. reason" gets the choice italicized and the verdict bolded.
  function mdLite(text) {
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
    return String(text).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => {
      if (/^- /.test(p)) return "<ul>" + p.split(/\n/).map(l => `<li>${inline(l.replace(/^- /, ""))}</li>`).join("") + "</ul>";
      const v = p.match(/^([^:*]{2,120}):\s*(true|false|correct|incorrect|wrong|right|not the answer|the answer)\b([.,;]?)(.*)$/is);
      if (v) return `<p><em>${esc(v[1])}</em>: <strong>${esc(v[2])}</strong>${esc(v[3])}${inline(v[4])}</p>`;
      return `<p>${inline(p).replace(/\n/g, "<br>")}</p>`;
    }).join("");
  }

  // practice questions carry our own answer key: explanation, figure, teaching table,
  // why each wrong choice is wrong, then the takeaway. HTML is limited to a small
  // allowlist by tools/validate.py.
  function practiceHTML(q) {
    const x = q.explain || {}, L = "ABCDEFGH";
    const lec = lecName(q.lecture, q);
    let h = `<div class="pq">`;
    h += `<div class="pq-head"><span class="pq-ans">${L[q.answer]}. ${esc(q.choices[q.answer])}</span></div>`;
    if ((q.figures || []).length) {
      h += `<div class="qf-figures pq-figs">` + q.figures.map(f => {
        const cap = f.caption || `${lec} · Slide ${f.slide}`;
        return `<button class="qf-figure" data-img="${esc(f.image)}" data-cap="${esc(cap)}"><img loading="lazy" src="${esc(f.image)}" alt="${esc(cap)}"><span class="qf-figure__cap">${esc(cap)}</span></button>`;
      }).join("") + `</div>`;
    }
    if (x.objective) h += `<div class="pq-obj">${esc(lec)} · ${esc(x.objective)}</div>`;
    h += `<div class="pq-expl"><b class="pq-lab">Explanation:</b> ${x.html || ""}</div>`;
    if (x.table) h += `<div class="pq-table">${x.table}</div>`;
    if ((x.rows || []).length) {
      h += `<div class="pq-table pq-wrong"><table><thead><tr><th>Wrong choice</th><th>Why it is wrong here</th><th>What would make it right</th></tr></thead><tbody>` +
        x.rows.map(r => `<tr><td><b>${L[r.choice]}.</b> ${esc(q.choices[r.choice])}</td><td>${esc(r.why)}</td><td>${esc(r.if_right)}</td></tr>`).join("") +
        `</tbody></table></div>`;
    } else {
      h += (x.why || []).map((w, i) => i === q.answer || !w ? "" : `<p class="pq-why"><b>Choice ${L[i]}.</b> ${esc(w)}</p>`).join("");
    }
    if (x.takeaway) h += `<div class="pq-take"><b>${x.rows ? "LO" : "The takeaway"}</b>${esc(x.takeaway)}</div>`;
    const sl = x.slides;
    if (sl) {
      const pg = a => (a || []).join(", ");
      const wrong = (x.rows || []).map((r, i) => `${L[r.choice]} ${pg([sl.distractors[i]])}`).join(", ");
      h += `<div class="pq-slides"><b>Slides</b> (${esc(x.deck || lec)}, 2025-26 deck): stem ${pg(sl.stem) || "n/a"} · answer ${pg(sl.answer)}${wrong ? " · wrong choices " + esc(wrong) : ""}</div>`;
    }
    h += `</div>`;
    h += `<div class="qf-cite">Practice question written from the slides${q.source_ref ? " · " + esc(q.source_ref) : ""}${x.topic ? " · Topic: " + esc(x.topic) : ""}</div>`;
    return h;
  }

  // stem text with "[[labs N]]" marker lines swapped for real lab tables
  function stemHTML(q) {
    return String(q.stem || "").split("\n").map(line => {
      const m = line.match(/^\[\[labs (\d+)\]\]$/);
      const t = m && (q.labs || [])[+m[1]];
      if (!t) return esc(line) + "<br>";
      return `<table class="q-labs">` + t.map((r, i) => `<tr>${r.map(c => i === 0 && t.length > 2 && r.length > 2 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join("")}</tr>`).join("") + `</table>`;
    }).join("").replace(/(<br>)+$/, "");
  }

  function evidenceHTML(q) {
    if (q.source === "practice") return practiceHTML(q);
    const quotes = (q.evidence || []).filter(e => e.type !== "slide");
    const slides = (q.evidence || []).filter(e => e.type === "slide");
    let h = "";
    if (quotes.length) {
      // one box for all quotes; each quote gets a single header row: "Said in Lecture 01: ... · 00:11:22"
      h += `<div class="ev-q ev-quotes">` + quotes.map(e => {
        const lec = e.lecture ? lecName(e.lecture) : lecName(q.lecture);
        if (e.type === "mine") {
          const badge = e.found === true ? ` <span class="ev-ok" title="This exact text was found in the PDF you attached">✓ found in your PDF</span>`
            : e.found === false ? ` <span class="ev-warn" title="This text was not found word for word in the PDF you attached. Double-check it.">not found in your PDF</span>` : "";
          return `<blockquote class="ev-item ev-mine"><div class="ev-src">From your notes${e.where ? ` <span class="ev-at">· ${esc(e.where)}</span>` : ""}${badge}</div>“${esc(e.quote)}”</blockquote>`;
        }
        const head = e.type === "transcript"
          ? `Said in ${esc(lec)}${e.at ? ` <span class="ev-at">· ${esc(e.at)}</span>` : ""}`
          : `From the ${esc(lec)} notes${e.page ? ` <span class="ev-at">· p. ${esc(e.page)}</span>` : ""}`;
        return `<blockquote class="ev-item ev-${e.type}"><div class="ev-src">${head}</div>“${esc(e.quote)}”</blockquote>`;
      }).join("") + `</div>`;
    }
    if (slides.length) {
      h += `<div class="qf-figures">` + slides.map(e => {
        const cap = `${lecName(e.lecture || q.lecture, q.mine ? q : null)} · Slide ${e.slide}`;
        return e.image
          ? `<button class="qf-figure" data-img="${esc(e.image)}" data-cap="${esc(cap)}"><img ${String(e.image).startsWith("blob:") ? "" : 'loading="lazy"'} src="${esc(e.image)}" alt="${esc(cap)}"><span class="qf-figure__cap">${esc(cap)}</span></button>`
          : `<div class="qf-figure__cap">${esc(cap)}${q.mine ? " (attach the lecture PDF to this quiz to see the slide)" : ""}</div>`;
      }).join("") + `</div>`;
    }
    if (q.note && q.mine) {
      h += `<details class="ev-note" open><summary>Explanation (written by your AI, not checked by this site)</summary><div class="ev-note-body">${mdLite(q.note)}</div></details>`;
    } else if (q.note) {
      h += `<details class="ev-note"><summary>Contributor's note (paraphrase, not the professor's words)</summary><div class="ev-note-body">${mdLite(q.note)}</div></details>`;
    }
    const lab = { slide: "Lecture slide question", notes: "Lecture notes question", formative: "Formative quiz question", said: "Asked in lecture", mine: "Question found in your notes", ai: "AI-written from your notes" }[q.source] || "";
    h += `<div class="qf-cite">${esc(lab)}${q.source_ref ? " · " + esc(q.source_ref) : ""} · ${esc(lecName(q.lecture, q))}</div>`;
    return h;
  }

  // full-screen image viewer; ← / → (or the on-screen arrows) move between the images shown with this question
  function wireViewer(root) {
    let v = document.getElementById("qbViewer");
    let list = [], idx = 0;
    const show = () => {
      const f = list[idx]; if (!f) return;
      v.querySelector("img").src = f.dataset.img;
      v.querySelector(".cap").textContent = f.dataset.cap || "";
      v.querySelector(".cnt").textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : "";
      v.querySelectorAll(".nav").forEach(b => { b.hidden = list.length < 2; });
    };
    const step = d => { if (list.length > 1) { idx = (idx + d + list.length) % list.length; show(); } };
    if (!v) {
      v = document.createElement("dialog");
      v.id = "qbViewer"; v.className = "qf-viewer";
      v.innerHTML = `<button class="vw-arrow nav prev" aria-label="Previous image">‹</button><img alt=""><button class="vw-arrow nav next" aria-label="Next image">›</button>
        <div class="qf-viewer__bar"><span class="cap"></span><span class="cnt"></span><span class="hint">← → to move · Esc to close</span><button class="qf-btn qf-btn--sm close">Close</button></div>`;
      document.body.appendChild(v);
      v.querySelector(".close").onclick = () => v.close();
      v.addEventListener("click", e => { if (e.target === v) v.close(); });
      v.querySelector(".prev").onclick = e => { e.stopPropagation(); step(-1); };
      v.querySelector(".next").onclick = e => { e.stopPropagation(); step(1); };
      v.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); step(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); step(1); }
      });
      v._step = step;
    }
    root.addEventListener("click", e => {
      const f = e.target.closest("[data-img]"); if (!f) return;
      list = [...root.querySelectorAll("[data-img]")].filter(x => x.offsetParent !== null);
      idx = Math.max(0, list.indexOf(f));
      show(); v.showModal();
    });
  }

  // "Realistic font variance": each lecture's questions get their own font family and base size,
  // the way professor-written exam questions look slightly different from each other.
  const FONTS = [
    { family: '"Roboto", Arial, sans-serif', size: 15 },
    { family: 'Arial, "Helvetica Neue", Helvetica, sans-serif', size: 14.5 },
    { family: '"Times New Roman", Times, serif', size: 16.5 },
    { family: 'Calibri, Carlito, "Segoe UI", Candara, sans-serif', size: 16 },
    { family: 'Verdana, Geneva, sans-serif', size: 13.5 },
    { family: 'Georgia, "Times New Roman", serif', size: 15 },
    { family: 'Tahoma, "Segoe UI", Geneva, sans-serif', size: 14 },
    { family: '"Trebuchet MS", "Lucida Grande", sans-serif', size: 15.5 },
  ];
  function lecFont(lectureId) {
    let h = 0;
    for (const c of String(lectureId)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return FONTS[h % FONTS.length];
  }

  window.Explain = { evidenceHTML, stemHTML, wireViewer, esc, lecName, mdLite, lecFont };
})();
