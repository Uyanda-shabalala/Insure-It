"""
Insure-It backup OCR service (v2).

Run:  python -m uvicorn ocr_service:app --port 8001
Needs extractor.py in the same folder.

POST /ocr   multipart/form-data, field "file" (image)
            optional query params: mode=auto|original|enhanced|clahe|threshold|sharpen|rotated
                                   debug=true  (adds per-pass details)
GET  /health
"""
import io
import logging
import threading
import time

import cv2
import easyocr
import numpy as np
from fastapi import FastAPI, File, Query, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps

from extractor import extract_serial

log = logging.getLogger("ocr_service")
logging.basicConfig(level=logging.INFO)

MAX_BYTES = 10 * 1024 * 1024      # 10 MB upload limit
MIN_SIDE = 50                     # px
Image.MAX_IMAGE_PIXELS = 60_000_000

app = FastAPI(title="Insure-It backup OCR")
reader = easyocr.Reader(["en"], gpu=False)
reader_lock = threading.Lock()    # EasyOCR reader is not guaranteed thread-safe


# ---------------------------------------------------------------- errors
class ApiError(Exception):
    def __init__(self, http_status, code, message):
        self.http_status, self.code, self.message = http_status, code, message


def _error_response(http_status, code, message):
    return JSONResponse(
        status_code=http_status,
        content={"status": "error", "serial": None, "error": {"code": code, "message": message}},
    )


@app.exception_handler(ApiError)
async def api_error_handler(_, exc: ApiError):
    return _error_response(exc.http_status, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_handler(_, exc):
    return _error_response(400, "MISSING_FILE", "Send an image in the multipart form field 'file'.")


# ---------------------------------------------------------------- images
def load_image(data: bytes) -> Image.Image:
    if not data:
        raise ApiError(400, "EMPTY_FILE", "The uploaded file is empty.")
    if len(data) > MAX_BYTES:
        raise ApiError(413, "FILE_TOO_LARGE", f"Image must be under {MAX_BYTES // (1024 * 1024)} MB.")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        raise ApiError(400, "INVALID_IMAGE", "The file is not a readable image (use JPG, PNG or WEBP).")
    img = ImageOps.exif_transpose(img).convert("RGB")      # fix phone rotation
    if min(img.size) < MIN_SIDE:
        raise ApiError(400, "IMAGE_TOO_SMALL", f"Image must be at least {MIN_SIDE}px on each side.")
    return img


def fit_size(img: Image.Image, low=1600, high=2600) -> Image.Image:
    """Upscale small images (helps small print), shrink huge ones (keeps CPU time sane)."""
    w, h = img.size
    longest = max(w, h)
    if longest < low:
        scale = min(low / longest, 3.0)
    elif longest > high:
        scale = high / longest
    else:
        return img
    return img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)


# ---------------------------------------------------------------- preprocessing variants
def _gray(img):
    return np.array(ImageOps.grayscale(img))


def v_original(img):
    return np.array(img)


def v_enhanced(img):
    return np.array(ImageOps.autocontrast(ImageOps.grayscale(img), cutoff=1))


def v_clahe(img):
    """Local contrast boost: good for low contrast and uneven lighting."""
    return cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(_gray(img))


def v_threshold(img):
    """Adaptive threshold: good for shadows, glare gradients and poor lighting."""
    g = cv2.GaussianBlur(_gray(img), (3, 3), 0)
    return cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10)


def v_sharpen(img):
    """Unsharp mask: good for mildly blurry photos."""
    g = _gray(img)
    return cv2.addWeighted(g, 1.8, cv2.GaussianBlur(g, (0, 0), 3), -0.8, 0)


VARIANTS = {
    "original": (v_original, None),
    "enhanced": (v_enhanced, None),
    "clahe": (v_clahe, None),
    "threshold": (v_threshold, None),
    "sharpen": (v_sharpen, None),
    "rotated": (v_enhanced, [90, 180, 270]),   # slowest: also tries sideways / upside-down text
}
AUTO_ORDER = ["original", "enhanced", "clahe", "threshold", "sharpen", "rotated"]


def ocr_pass(img, name):
    fn, rotation = VARIANTS[name]
    arr = fn(img)
    with reader_lock:
        return reader.readtext(arr, detail=1, paragraph=False, rotation_info=rotation)


def run(img, mode):
    """Run one pass (mode=name) or several (mode=auto, stops at the first confident result)."""
    names = AUTO_ORDER if mode == "auto" else [mode]
    best, best_score, passes = None, -999.0, []
    for name in names:
        results = ocr_pass(img, name)
        out = extract_serial(results)
        out["raw_text"] = [r[1] for r in results]
        out["preprocessing"] = name
        top = out["candidates"][0]["score"] if out["candidates"] else -999.0
        passes.append({"pass": name, "status": out["status"], "serial": out["serial"], "score": top})
        if best is None or top > best_score:
            best, best_score = out, top
        if out["status"] == "ok":
            best = out
            break
    return best, passes


# ---------------------------------------------------------------- endpoints
@app.get("/health")
def health():
    return {"status": "up"}


@app.post("/ocr")
def ocr(file: UploadFile = File(...), mode: str = Query("auto"), debug: bool = Query(False)):
    started = time.time()
    if mode != "auto" and mode not in VARIANTS:
        raise ApiError(400, "INVALID_MODE", f"mode must be 'auto' or one of {sorted(VARIANTS)}.")

    data = file.file.read(MAX_BYTES + 1)
    img = fit_size(load_image(data))

    try:
        best, passes = run(img, mode)
    except Exception:
        log.exception("OCR processing failed")
        raise ApiError(500, "PROCESSING_ERROR", "The image could not be processed. Please try again.")

    response = {
        "status": best["status"],          # ok | low_confidence | not_detected
        "serial": best["serial"],          # null when not_detected
        "confidence": best["confidence"],  # 0..1
        "candidates": best["candidates"],  # up to 3, so the UI can offer alternatives
        "raw_text": best["raw_text"],
        "preprocessing": best["preprocessing"],
        "source": "fallback",
        "processing_ms": int((time.time() - started) * 1000),
    }
    if debug:
        response["passes"] = passes
    return response
