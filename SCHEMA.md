# Question file format

One file per lecture: `data/lectures/<lecture_id>.json`. The file name must equal `lecture_id`.

```json
{
 "lecture_id": "gi-w01-lec02",
 "block": "GI",
 "week": 1,
 "lecture": "02 Salivary Gastric and Pancreatic Secretions",
 "contributor": "thirth",
 "questions": [
  {
   "id": "gi-w01-lec02-q01",
   "source": "slide",
   "source_ref": "Slide 11",
   "stem": "Which one of the following statements is INCORRECT?",
   "choices": ["...", "...", "...", "..."],
   "answer": 3,
   "evidence": [
    {"type": "transcript", "quote": "exact words from transcript.txt", "at": "00:14:32"},
    {"type": "notes", "quote": "exact words from notes.txt", "page": 4},
    {"type": "slide", "slide": 11, "image": "img/gi-w01-lec02/slide_11.png"}
   ],
   "note": "optional short paraphrase, shown collapsed and labeled as not the professor's words"
  }
 ]
}
```

| Field | Rule |
|---|---|
| `lecture_id` | `<block>-w<WW>-<lecNN or lab-name>`, lowercase, hyphens. |
| `week` | Integer week of the block. Release unit is `BLOCK/week` (see `data/releases.json`). |
| `id` | `<lecture_id>-qNN`. Never reuse or renumber an id once released: students' saved progress is keyed on it. Add new questions at the end. |
| `source` | Where the question itself came from: `slide` (printed on a slide), `notes` (lecture notes / ebook), `formative` (formative quiz), `said` (professor asked or posed it out loud). |
| `source_ref` | Human pointer: `Slide 11`, `Notes p. 4`, `Formative 2 Q3`, `00:41:10`. |
| `stem_image` | Optional. An image that is part of the question itself (ECG, histology, CT), e.g. `img/<lecture_id>/slide_50.jpg`. No HTML in `stem` or `choices`: plain text only. |
| `answer` | 0-based index into `choices`. |
| `evidence` | At least one block. Quotes must be **word for word** from `sources/<lecture_id>/transcript.txt` or `notes.txt`. The validator ignores case, whitespace, curly quotes and timestamps, nothing else. Keep quotes to the sentences that answer the question. |
| `lecture` (on an evidence block) | Optional. Only when the quote or slide comes from a *different* lecture than the question, e.g. `"07 Biliary Disease"`. The site shows the lecture name on every quote either way. |
| `note` | Optional paraphrase shown collapsed. Light Markdown: `**bold**`, `*italic*`, blank line between paragraphs, `- ` list items. Start with the one-sentence takeaway in bold, then one paragraph per answer choice (`Choice text: true. why`). |
| `image` | PNG/JPG under `img/<lecture_id>/`, max ~1600 px wide. |

Run `python3 tools/validate.py` before every commit. It checks all of this and rebuilds `data/manifest.json`.
