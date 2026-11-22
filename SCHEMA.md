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
| `source` | Where the question itself came from: `slide` (printed on a slide), `notes` (lecture notes / ebook), `formative` (formative quiz), `said` (professor asked or posed it out loud), `practice` (written by a student from the slides; see below). |
| `source_ref` | Human pointer: `Slide 11`, `Notes p. 4`, `Formative 2 Q3`, `00:41:10`. |
| `stem_image` | Optional. An image that is part of the question itself (ECG, histology, CT), e.g. `img/<lecture_id>/slide_50.jpg`. No HTML in `stem` or `choices`: plain text only. |
| `answer` | 0-based index into `choices`. |
| `evidence` | At least one block. Quotes must be **word for word** from `sources/<lecture_id>/transcript.txt` or `notes.txt`. The validator ignores case, whitespace, curly quotes and timestamps, nothing else. Keep quotes to the sentences that answer the question. |
| `from` + `lecture` (on an evidence block) | Only when the quote comes from a *different* lecture's recording or notes (e.g. answers read out at the start of the next lecture). `from` is that lecture's `lecture_id` (the validator checks the quote against `sources/<from>/`), and `lecture` is its display name, e.g. `"17 Essential Trace minerals"`. |
| `note` | Optional paraphrase shown collapsed. Light Markdown: `**bold**`, `*italic*`, blank line between paragraphs, `- ` list items. Start with the one-sentence takeaway in bold, then one paragraph per answer choice (`Choice text: true. why`). |
| `image` | PNG/JPG under `img/<lecture_id>/`, max ~1600 px wide. |

Run `python3 tools/validate.py` before every commit. It checks all of this and rebuilds `data/manifest.json`.

## Practice questions (`source: "practice"`)

Board-style questions a student wrote from the slides, kept apart from the collected ones. They show up as their own "Practice questions (written)" source on the Create Test page, so anyone can turn them off.

- No verbatim evidence needed (`evidence` may be `[]`), since nothing is quoted.
- `source_ref` is required and names the slides it was written from, e.g. `Written from the 2025-26 Lecture 23 slides`.
- `explain` holds the answer key, shown after answering in this order:
  - `html`: the explanation, paragraphs in `<p>`; only plain `p b i strong em sup sub br ul ol li table thead tbody tr th td` tags, no attributes (the validator checks).
  - `figures` (on the question, not inside `explain`): optional list of `{"image", "slide", "caption"}`, a lecture slide that shows the concept, under `img/<lecture_id>/`, each under ~400 KB.
  - `table`: optional teaching table, same tag rules.
  - `why`: one string per choice saying why it is wrong (empty for the answer).
  - `takeaway`: the one-sentence point, shown in a box at the end.
  - `topic`, `subject`: shown in the footer.
