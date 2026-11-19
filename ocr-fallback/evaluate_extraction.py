"""
Measure serial extraction accuracy of the backup OCR service.

1. Put 30-50 photos in  photos/
2. python evaluate_extraction.py --template      (creates labels.csv; fill in the serial column)
3. Start the service:   python -m uvicorn ocr_service:app --port 8001
4. python evaluate_extraction.py                 (mode=auto)
   python evaluate_extraction.py --modes original enhanced clahe threshold sharpen rotated auto
"""
import argparse
import csv
import os
import time

import requests

URL = "http://localhost:8001/ocr"
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def norm(s):
    return "".join((s or "").split()).upper()


def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def make_template(folder, labels):
    if os.path.exists(labels):
        raise SystemExit(f"{labels} already exists - not overwriting it.")
    files = sorted(f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in IMAGE_EXT)
    with open(labels, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["filename", "serial"])
        for name in files:
            w.writerow([name, ""])
    print(f"Wrote {labels} with {len(files)} photos. Fill in the serial column, then run again.")


def call_service(path, mode):
    with open(path, "rb") as f:
        r = requests.post(URL, params={"mode": mode}, files={"file": (os.path.basename(path), f)}, timeout=300)
    return r.status_code, r.json()


def evaluate(mode, rows, folder):
    out, counts = [], dict(correct=0, incorrect=0, not_detected=0, error=0)
    confident_wrong = in_top3 = 0
    total_time = 0.0
    print(f"\n=== mode: {mode} ===")
    for filename, truth in rows:
        path = os.path.join(folder, filename)
        if not os.path.exists(path):
            print(f"  [skip] {filename} not found")
            continue
        t0 = time.time()
        try:
            code, body = call_service(path, mode)
        except Exception as e:
            code, body = 0, {"status": "error", "error": {"message": str(e)}}
        secs = time.time() - t0
        total_time += secs

        status = body.get("status")
        pred = body.get("serial")
        cands = [c["value"] for c in body.get("candidates", [])]
        if code != 200 or status == "error":
            outcome = "error"
        elif pred is None:
            outcome = "not_detected"
        elif norm(pred) == norm(truth):
            outcome = "correct"
        else:
            outcome = "incorrect"
            if status == "ok":
                confident_wrong += 1
        if norm(truth) in [norm(c) for c in cands]:
            in_top3 += 1
        counts[outcome] += 1
        print(f"  {outcome.upper():13} {filename:28} truth={truth:16} got={pred}  [{status}]")
        out.append([filename, truth, pred or "", status, outcome, body.get("confidence", ""),
                    edit_distance(norm(pred), norm(truth)) if pred else "", body.get("preprocessing", ""),
                    round(secs, 1), " | ".join(body.get("raw_text", []))])

    n = sum(counts.values())
    pct = lambda k: f"{100 * counts[k] / n:.1f}%" if n else "-"
    print(f"\n  Photos tested        : {n}")
    print(f"  Correct              : {counts['correct']} ({pct('correct')})")
    print(f"  Incorrect (wrong)    : {counts['incorrect']} ({pct('incorrect')})")
    print(f"  Not detected (null)  : {counts['not_detected']} ({pct('not_detected')})")
    print(f"  Errors               : {counts['error']}")
    print(f"  Wrong but 'ok'       : {confident_wrong}   <- the dangerous ones")
    print(f"  Truth in top-3       : {in_top3}")
    print(f"  Avg time per photo   : {total_time / max(n, 1):.1f}s")

    fname = f"results_{mode}.csv"
    with open(fname, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["filename", "truth", "predicted", "status", "outcome", "confidence",
                    "edit_distance", "preprocessing", "seconds", "raw_text"])
        w.writerows(out)
    print(f"  Saved {fname}")
    return mode, n, counts, confident_wrong, total_time / max(n, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folder", default="photos")
    ap.add_argument("--labels", default="labels.csv")
    ap.add_argument("--modes", nargs="+", default=["auto"])
    ap.add_argument("--template", action="store_true", help="create labels.csv from the photos folder")
    args = ap.parse_args()

    if args.template:
        return make_template(args.folder, args.labels)

    with open(args.labels, newline="", encoding="utf-8-sig") as f:
        rows = [(r["filename"].strip(), r["serial"].strip()) for r in csv.DictReader(f) if r["serial"].strip()]
    print(f"Loaded {len(rows)} labelled photos")

    summary = [evaluate(m, rows, args.folder) for m in args.modes]

    print("\n| Mode | Photos | Correct | Incorrect | Not detected | Wrong but ok | Avg s |")
    print("|---|---|---|---|---|---|---|")
    for mode, n, c, cw, avg in summary:
        print(f"| {mode} | {n} | {c['correct']} ({100 * c['correct'] / max(n, 1):.0f}%) | "
              f"{c['incorrect']} | {c['not_detected']} | {cw} | {avg:.1f} |")


if __name__ == "__main__":
    main()
