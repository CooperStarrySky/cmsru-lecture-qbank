/* pdfslides.js — reads a lecture PDF in the browser (pdf.js, loaded only when needed).
   PdfSlides.open(file) -> {numPages, texts(): Promise<string[]>, render(pages, onProgress): Promise<{page: Blob}>} */
(function () {
  const VER = "3.11.174";
  const BASE = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VER}/`;
  let loading = null;
  function lib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!loading) loading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = BASE + "pdf.min.js";
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + "pdf.worker.min.js"; res(window.pdfjsLib); };
      s.onerror = () => { loading = null; rej(new Error("Couldn't load the PDF reader. Check your internet connection and try again.")); };
      document.head.appendChild(s);
    });
    return loading;
  }
  async function open(file) {
    const pdfjs = await lib();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    return {
      numPages: doc.numPages,
      async texts() {
        const out = [];
        for (let p = 1; p <= doc.numPages; p++) {
          const tc = await (await doc.getPage(p)).getTextContent();
          out.push(tc.items.map(i => i.str).join(" "));
        }
        return out;
      },
      async render(pages, onProgress) {
        const out = {};
        let done = 0;
        for (const p of pages) {
          if (p < 1 || p > doc.numPages) continue;
          const page = await doc.getPage(p);
          const v1 = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: Math.min(3, 1400 / v1.width) });
          const c = document.createElement("canvas");
          c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          out[p] = await new Promise(r => c.toBlob(r, "image/jpeg", 0.78));
          onProgress && onProgress(++done, pages.length);
        }
        return out;
      },
    };
  }
  window.PdfSlides = { open };
})();
