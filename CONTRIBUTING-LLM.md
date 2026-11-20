# Instructions for an AI assistant adding a lecture

You are helping a medical student add one lecture's practice questions to this question bank. Read this file and `SCHEMA.md` fully before writing anything.

## The one rule

**Only questions that already exist in the course material go in.** You are collecting, not writing. A question belongs here only if it was:

- printed on a lecture slide (`source: "slide"`),
- in the lecture notes or ebook (`source: "notes"`),
- on a formative quiz (`source: "formative"`), or
- asked or posed out loud by the professor in the recording (`source: "said"`).

Never invent a question, never "improve" a stem, never add a distractor. Copy stems and choices exactly. Fix only obvious typos. If a spoken question has no choices (e.g. "what happens to preload here?"), turn it into multiple choice only when the professor gave the answer and the plausible alternatives in the same passage, and say so in `note`.

## Inputs you need from the student

1. The slide PDF.
2. The transcript, as plain text (Echo360 `.vtt` or `.txt`).
3. Lecture notes / ebook text, if any.
4. Formative quiz questions with the official answers, if any.

Ask for whatever is missing. Do not guess the answer to any question. If the material does not settle the answer, leave the question out and list it in your report.

## Steps

1. **Pick the id.** `lecture_id` = `<block>-w<WW>-lec<NN>` (e.g. `renal-w02-lec11`). Check `data/lectures/` so you don't collide with an existing file. If the lecture already has a file, append new questions with the next free `qNN`. Never renumber.
2. **Save the sources.** Put the transcript text at `sources/<lecture_id>/transcript.txt` and the notes text at `sources/<lecture_id>/notes.txt`. Plain UTF-8. Keep the VTT timestamps in if you have them, since the validator ignores them.
3. **Find the questions.** Go slide by slide, then through the notes, then the formative, then the transcript (search for "?", "question", "quiz", "what would", "which of", "board question", "on the exam").
4. **Find the evidence for each answer.** For every question add at least one evidence block:
   - a `transcript` quote with the professor's exact words explaining the answer, with `at` = timestamp,
   - and/or a `notes` quote with `page`,
   - and/or the `slide` where the answer is shown.
   Copy quotes character for character. Shorter is better: the one to three sentences that settle it.
5. **Export slide images** for the slides you cite: `pdftoppm -png -r 110 -f N -l N slides.pdf img/<lecture_id>/slide` then rename to `slide_NN.png` (two digits). Keep each image under ~400 KB.
6. **Write `data/lectures/<lecture_id>.json`** per `SCHEMA.md`.
7. **Run `python3 tools/validate.py`** and fix every error. A quote that fails means you paraphrased. Go back to the source and copy it exactly.
8. **Open a pull request** titled `Add <BLOCK> week <N> lecture <NN>: <name>`. Body: number of questions by source, anything you left out and why, anything a human should double-check.

Do not edit `data/releases.json`. Releasing a week is done on Friday by a maintainer after review.

## Quality checks before you open the PR

- The answer index points at the right choice. Re-read each one.
- Each evidence quote actually supports the keyed answer, not just the topic.
- No duplicate questions (same stem asked on a slide and again in the formative: keep one, cite both in `source_ref`).
- Medical accuracy: if the source itself looks wrong or contradicts another slide, keep it as the professor gave it, and flag it in the PR body. Do not silently correct the professor.

## Preview

`python3 -m http.server 8000` in the repo root, then open `http://localhost:8000/?preview=1` to see unreleased weeks.
