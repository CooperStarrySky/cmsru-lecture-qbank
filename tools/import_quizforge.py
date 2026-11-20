#!/usr/bin/env python3
"""Import QuizForge MD "slideq" quiz files (professor's own slide questions)
into the qbank lecture format. Copies the cited slide PNGs.

Usage:
  python3 tools/import_quizforge.py --block GI --quiz <path/to/gi-lec02-slideq-001.json> \
      --slides-root <AnkiCards/assets/_quiz_slides> [--transcript <transcript.txt>] [--notes <notes.txt>]

The old QuizForge explanation is kept as `note` (paraphrase). Quote evidence is
added afterwards with tools/add_quote.py or by a contributor; the validator
then checks every quote word-for-word against sources/<lecture_id>/.
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def slug_from_images(q):
    for p in q.get("slide_images", []):
        return p.split("/")[0]
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--block", required=True)
    ap.add_argument("--quiz", required=True)
    ap.add_argument("--slides-root", required=True)
    ap.add_argument("--transcript")
    ap.add_argument("--notes")
    a = ap.parse_args()

    d = json.loads(Path(a.quiz).read_text())
    folder = d["lecture_folder"]                      # "Week 01/02 Salivary ..."
    m = re.match(r"Week (\d+)/(.+)", folder)
    week = int(m.group(1)) if m else 0
    lecture = m.group(2) if m else folder
    slug = next((slug_from_images(q) for q in d["questions"] if slug_from_images(q)), None)
    if not slug:
        num = re.match(r"(\d+|LAB)", lecture)
        slug = f"{a.block.lower()}_w{week:02d}_{(num.group(1) if num else 'x').lower()}"
    lid = slug.replace("_", "-")

    out_q = []
    for i, q in enumerate(d["questions"], 1):
        ev = []
        for p in q.get("slide_images", []):
            n = int(re.search(r"slide_(\d+)", p).group(1))
            src = Path(a.slides_root) / p
            dst = ROOT / "img" / lid / f"slide_{n:02d}.jpg"
            if src.exists():
                dst.parent.mkdir(parents=True, exist_ok=True)
                # shrink to a ~1400px JPEG (macOS sips; falls back to a plain copy)
                r = subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "72",
                                    "--resampleWidth", "1400", str(src), "--out", str(dst)],
                                   capture_output=True)
                if r.returncode != 0:
                    shutil.copy2(src, dst.with_suffix(src.suffix))
                ev.append({"type": "slide", "slide": n, "image": f"img/{lid}/slide_{n:02d}.jpg"})
            else:
                print(f"  warn: missing slide image {src}", file=sys.stderr)
        stem, stem_img = q["text"], None
        m = re.search(r'<img src="/slides/([^"]+)"[^>]*>', stem)
        if m:
            n = int(re.search(r"slide_(\d+)", m.group(1)).group(1))
            dst = ROOT / "img" / lid / f"slide_{n:02d}.jpg"
            dst.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "72", "--resampleWidth", "1400",
                            str(Path(a.slides_root) / m.group(1)), "--out", str(dst)], capture_output=True)
            stem_img = f"img/{lid}/slide_{n:02d}.jpg"
            stem = stem.replace(m.group(0), "")
        stem = re.sub(r"<br\s*/?>", "\n", stem)
        stem = re.sub(r"<[^>]+>", "", stem).strip()
        note = re.sub(r"<br\s*/?>", "\n", q.get("explanation", ""))
        note = re.sub(r"<[^>]+>", "", note).strip()
        out_q.append({
            "id": f"{lid}-q{i:02d}",
            "source": "slide",
            "source_ref": q.get("citation", ""),
            "stem": stem,
            **({"stem_image": stem_img} if stem_img else {}),
            "choices": q["options"],
            "answer": q["correct"],
            "evidence": ev,
            "note": note,
        })

    rec = {
        "lecture_id": lid,
        "block": a.block.upper(),
        "week": week,
        "lecture": lecture,
        "contributor": "thirth",
        "questions": out_q,
    }
    dst = ROOT / "data" / "lectures" / f"{lid}.json"
    dst.write_text(json.dumps(rec, indent=1, ensure_ascii=False) + "\n")
    for kind, p in (("transcript", a.transcript), ("notes", a.notes)):
        if p and Path(p).exists():
            sd = ROOT / "sources" / lid
            sd.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, sd / f"{kind}.txt")
    print(f"{lid}: {len(out_q)} questions -> {dst.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
