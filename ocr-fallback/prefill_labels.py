"""
Pre-fill a labels file with the OCR service's guesses so you only have to VERIFY them.

Needs the service running:  python -m uvicorn ocr_service:app --port 8001
Run:  python prefill_labels.py
Output: labels_prefilled.csv   (your existing labels.csv is not touched)

Then open labels_prefilled.csv, check every row against its photo, fix wrong
serials, and clear the serial for photos that have no readable serial.
Test with:  python evaluate_extraction.py --labels labels_prefilled.csv
"""
import csv
import os

import requests

URL = "http://localhost:8001/ocr"
FOLDER = "photos"
OUT = "labels_prefilled.csv"
EXT = {".jpg", ".jpeg", ".png", ".webp"}

files = sorted(f for f in os.listdir(FOLDER) if os.path.splitext(f)[1].lower() in EXT)
rows = []
for i, name in enumerate(files, 1):
    try:
        with open(os.path.join(FOLDER, name), "rb") as f:
            r = requests.post(URL, params={"mode": "enhanced"}, files={"file": (name, f)}, timeout=300)
        body = r.json()
    except Exception as e:
        body = {"status": "error", "serial": None}
        print(f"  error on {name}: {e}")
    serial = body.get("serial") or ""
    status = body.get("status", "")
    print(f"[{i}/{len(files)}] {name}: {serial or '-'} ({status})")
    rows.append([name, serial, status])

with open(OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["filename", "serial", "service_status"])
    w.writerows(rows)

print(f"\nWrote {OUT}. Now verify every row by eye against its photo.")
