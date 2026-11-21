/* explain.js — renders a question's evidence: verbatim quotes and slides.
   Shared by quiz.html (tutor/timed) and exam.html review. */
(function () {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SRC = { transcript: "Said in lecture", notes: "Lecture notes", slide: "Slide" };

  // "02 Salivary Gastric..." -> "Lecture 02: Salivary Gastric..."; labs and others stay as written
  function lecName(name, q) {
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

  function evidenceHTML(q) {
    const quotes = (q.evidence || []).filter(e => e.type !== "slide");
    const slides = (q.evidence || []).filter(e => e.type === "slide");
    let h = "";
    if (quotes.length) {
      // one box for all quotes; each quote gets a single header row: "Said in Lecture 01: ... · 00:11:22"
      h += `<div class="ev-q ev-quotes">` + quotes.map(e => {
        const lec = e.lecture ? lecName(e.lecture) : lecName(q.lecture);
        const head = e.type === "transcript"
          ? `Said in ${esc(lec)}${e.at ? ` <span class="ev-at">· ${esc(e.at)}</span>` : ""}`
          : `From the ${esc(lec)} notes${e.page ? ` <span class="ev-at">· p. ${esc(e.page)}</span>` : ""}`;
        return `<blockquote class="ev-item ev-${e.type}"><div class="ev-src">${head}</div>“${esc(e.quote)}”</blockquote>`;
      }).join("") + `</div>`;
    }
    if (slides.length) {
      h += `<div class="qf-figures">` + slides.map(e => {
        const cap = `${lecName(e.lecture || q.lecture)} · Slide ${e.slide}`;
        return e.image
          ? `<button class="qf-figure" data-img="${esc(e.image)}" data-cap="${esc(cap)}"><img loading="lazy" src="${esc(e.image)}" alt="${esc(cap)}"><span class="qf-figure__cap">${esc(cap)}</span></button>`
          : `<div class="qf-figure__cap">${esc(cap)}</div>`;
      }).join("") + `</div>`;
    }
    if (q.note) {
      const sum = q.source === "practice" ? "Explanation (written by a student, not the professor's words)" : "Contributor's note (paraphrase, not the professor's words)";
      h += `<details class="ev-note"${q.source === "practice" ? " open" : ""}><summary>${sum}</summary><div class="ev-note-body">${mdLite(q.note)}</div></details>`;
    }
    const lab = { slide: "Lecture slide question", notes: "Lecture notes question", formative: "Formative quiz question", said: "Asked in lecture", practice: "Practice question written from the slides" }[q.source] || "";
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

  window.Explain = { evidenceHTML, wireViewer, esc, lecName, mdLite, lecFont };
})();
