# Insure-It Backup OCR Service

Self-hosted fallback that reads device serial numbers from photos when the Claude API is unavailable.
Spring Boot should call Claude first and call this service if Claude fails or times out.

## Files

| File | Purpose |
|---|---|
| `ocr_service.py` | FastAPI service (EasyOCR, image preprocessing, error handling) |
| `extractor.py` | Serial extraction: candidate scoring from EasyOCR output |
| `evaluate_extraction.py` | Measures exact-match accuracy on a labelled photo set |
| `prefill_labels.py` | Pre-fills a labels file with the service's guesses (for manual verification) |
| `requirements.txt` | Python packages |
| `results_SET1.csv` | Results of the 24-photo evaluation |
| `labels_prefilled.csv` | The 24 verified labels used for that evaluation |

## Setup (Windows)

Python 3.11 recommended. Use a path without spaces.

```bash
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
```

The first start downloads the EasyOCR models (a few hundred MB), so use a good connection.

## Run

```bash
python -m uvicorn ocr_service:app --port 8001
```

Wait for `Application startup complete`, then open http://localhost:8001/docs to test.

## API

`GET /health` returns `{"status":"up"}`.

`POST /ocr` takes `multipart/form-data` with an image in the field `file`.
Optional query parameters: `mode` (`auto`, `original`, `enhanced`, `clahe`, `threshold`, `sharpen`, `rotated`; default `auto`) and `debug=true`.

Success (HTTP 200):

```json
{
  "status": "ok",
  "serial": "E37735682",
  "confidence": 0.87,
  "candidates": [{"value": "E37735682", "score": 8.7, "reasons": ["ocr_conf=0.90", "label:SN(right)"]}],
  "raw_text": ["..."],
  "preprocessing": "enhanced",
  "source": "fallback",
  "processing_ms": 2100
}
```

`status` values:

- `ok`: confident result.
- `low_confidence`: a serial is returned but should be checked by the user (weak label, ambiguous candidates, or low OCR confidence).
- `not_detected`: `serial` is `null`; send the user to manual entry. Still HTTP 200.

Errors (HTTP 400 or 413 or 500):

```json
{"status": "error", "serial": null, "error": {"code": "INVALID_IMAGE", "message": "..."}}
```

Codes: `EMPTY_FILE`, `FILE_TOO_LARGE` (over 10 MB), `INVALID_IMAGE`, `IMAGE_TOO_SMALL`, `MISSING_FILE`, `INVALID_MODE`, `PROCESSING_ERROR`.

Suggested Spring Boot handling: pre-fill the confirm screen only when `status` is `ok`; show a warning for `low_confidence`; show an empty field for `not_detected`; treat any non-200 as a failure. The user always confirms before saving.

## How the serial is chosen

1. Every text box from EasyOCR (`detail=1`) is scanned for serial labels (S/N, SN, Serial No, Serial Number, Service Tag) and decoy labels (Model, P/N, MAC, Lot, IMEI, Asset, and others).
2. Alphanumeric tokens that could be serials become candidates.
3. Each candidate is linked to its label: same box, to the right on the same line, or directly below.
4. Score = label bonus or decoy penalty + format plausibility + OCR confidence.
5. Weak, ambiguous or low-OCR-confidence results are returned as `low_confidence`, not `ok`.

## Evaluation

```bash
python evaluate_extraction.py --template                 # creates labels.csv from photos/
python evaluate_extraction.py --labels labels.csv --modes enhanced
```

The script reports correct, incorrect and not-detected separately, plus wrong-but-`ok` and whether the truth is in the top 3 candidates.

### Results so far (`enhanced` mode)

24 manually verified photos: 24 correct (100%), 0 incorrect, 0 not detected, 0 wrong-but-`ok`. Truth was in the top 3 for all 24. Average 48.3 s per photo (CPU).

## Limitations

- **Evaluation size:** 24 photos, below the 30 to 35 target. Many photos show the same device (video frames), and the ground truth was pre-filled by the service and then verified by hand, so real-world accuracy is likely lower.
- **All results were `low_confidence`** because the labels had no explicit S/N keyword. The confirm screen is essential.
- **Speed:** about 48 s per photo on CPU. `mode=auto` can take several times longer. A GPU or smaller image sizes would help.
- **Untested:** the other preprocessing modes were implemented but not benchmarked.
- **Look-alike characters** (0/O, 1/I, 5/S, 6/G) can still be confused.
