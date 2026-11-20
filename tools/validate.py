#!/usr/bin/env python3
"""Check every lecture file and rebuild data/manifest.json.

  python3 tools/validate.py          # check + rewrite manifest
  python3 tools/validate.py --check  # check only; fail if manifest is stale (CI)

Rules:
- required fields and types (see SCHEMA.md)
- question ids unique across the whole bank
- every slide image exists
- every transcript/notes quote appears word for word in
  sources/<lecture_id>/transcript.txt or notes.txt (whitespace, curly quotes
  and case are ignored; nothing else is)
"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = {"slide", "notes", "formative", "said"}
EVTYPES = {"transcript", "notes", "slide"}


def norm(s):
    s = unicodedata.normalize("NFKC", s)
    s = s.translate(str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"',
                                   "–": "-", "—": "-", " ": " "}))
    # transcripts (.vtt-derived) may carry timestamps / speaker tags between words
    s = re.sub(r"\[?\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\]?", " ", s)
    return re.sub(r"\s+", " ", s).strip().lower()


_src_cache = {}


def source_texts(lecture_id):
    if lecture_id not in _src_cache:
        d = ROOT / "sources" / lecture_id
        _src_cache[lecture_id] = {k: norm((d / f"{k}.txt").read_text(errors="ignore"))
                                  for k in ("transcript", "notes") if (d / f"{k}.txt").exists()}
    return _src_cache[lecture_id]


def main():
    check_only = "--check" in sys.argv
    errs, seen, lectures = [], {}, []
    rel = json.loads((ROOT / "data/releases.json").read_text())
    released = set(rel.get("released_weeks", []))
    for f in sorted((ROOT / "data/lectures").glob("*.json")):
        where = f.relative_to(ROOT)
        try:
            d = json.loads(f.read_text())
        except Exception as e:
            errs.append(f"{where}: bad JSON: {e}"); continue
        for k, t in (("lecture_id", str), ("block", str), ("week", int), ("lecture", str), ("questions", list)):
            if not isinstance(d.get(k), t):
                errs.append(f"{where}: '{k}' missing or wrong type")
        lid = d.get("lecture_id", "")
        if f.stem != lid:
            errs.append(f"{where}: file name must equal lecture_id '{lid}'")
        srcdir = ROOT / "sources" / lid
        texts = {k: norm((srcdir / f"{k}.txt").read_text(errors="ignore"))
                 for k in ("transcript", "notes") if (srcdir / f"{k}.txt").exists()}
        counts = {s: 0 for s in sorted(SOURCES)}
        for q in d.get("questions", []):
            qid = q.get("id", "?")
            w = f"{where} {qid}"
            if qid in seen:
                errs.append(f"{w}: duplicate id (also in {seen[qid]})")
            seen[qid] = str(where)
            if q.get("source") not in SOURCES:
                errs.append(f"{w}: source must be one of {sorted(SOURCES)}")
            else:
                counts[q["source"]] += 1
            ch = q.get("choices")
            if not isinstance(ch, list) or len(ch) < 2:
                errs.append(f"{w}: needs 2+ choices")
            elif not (isinstance(q.get("answer"), int) and 0 <= q["answer"] < len(ch)):
                errs.append(f"{w}: answer must be a 0-based index into choices")
            if not q.get("stem"):
                errs.append(f"{w}: empty stem")
            elif "<" in q["stem"] or any("<" in str(c) for c in (ch or [])):
                errs.append(f"{w}: no HTML in stem/choices (put a question image in stem_image)")
            if q.get("stem_image") and not (ROOT / q["stem_image"]).exists():
                errs.append(f"{w}: missing stem_image {q['stem_image']}")
            ev = q.get("evidence", [])
            if not ev:
                errs.append(f"{w}: needs at least one evidence block (quote or slide)")
            for e in ev:
                t = e.get("type")
                if t not in EVTYPES:
                    errs.append(f"{w}: evidence type '{t}' not in {sorted(EVTYPES)}"); continue
                if t == "slide":
                    img = e.get("image")
                    if img and not (ROOT / img).exists():
                        errs.append(f"{w}: missing image {img}")
                    if not isinstance(e.get("slide"), int):
                        errs.append(f"{w}: slide evidence needs a slide number")
                else:
                    quote = e.get("quote", "")
                    # a quote may come from another lecture's recording/notes: "from": "<lecture_id>"
                    src_id = e.get("from") or lid
                    if src_id != lid and not e.get("lecture"):
                        errs.append(f"{w}: cross-lecture quote needs a \"lecture\" name to display")
                    qtexts = texts if src_id == lid else source_texts(src_id)
                    if len(quote.split()) < 4:
                        errs.append(f"{w}: {t} quote too short to verify")
                    elif t not in qtexts:
                        errs.append(f"{w}: no sources/{src_id}/{t}.txt to check the quote against")
                    elif norm(quote).rstrip(".") not in qtexts[t]:
                        errs.append(f"{w}: {t} quote not found word for word: \"{quote[:70]}...\"")
        key = f"{d.get('block')}/{d.get('week')}"
        lectures.append({
            "lecture_id": lid, "block": d.get("block"), "week": d.get("week"),
            "lecture": d.get("lecture"), "file": f"data/lectures/{f.name}",
            "n": len(d.get("questions", [])), "sources": counts,
            "released": key in released,
        })
    manifest = {"lectures": sorted(lectures, key=lambda x: (x["block"], x["week"], x["lecture"]))}
    text = json.dumps(manifest, indent=1, ensure_ascii=False) + "\n"
    mpath = ROOT / "data/manifest.json"
    if check_only:
        if not mpath.exists() or mpath.read_text() != text:
            errs.append("data/manifest.json is out of date: run python3 tools/validate.py and commit it")
    else:
        mpath.write_text(text)
    for e in errs:
        print("ERROR", e)
    n = sum(x["n"] for x in lectures)
    print(f"{len(lectures)} lectures, {n} questions, {len(errs)} problems")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
