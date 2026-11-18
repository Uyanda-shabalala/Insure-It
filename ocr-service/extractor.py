"""
Serial number extraction from EasyOCR output (detail=1).

Input : list of (bbox, text, confidence) from easyocr.Reader.readtext(..., detail=1)
Output: dict(status, serial, confidence, candidates)

How it works:
  1. Every text box is scanned for labels: serial labels (S/N, SN, Serial No,
     Serial Number, Service Tag) and decoy labels (Model, P/N, MAC, Lot, ...).
  2. Every alphanumeric token that could be a serial becomes a candidate.
  3. Each candidate is linked to its label: either inside the same box
     ("SN: ABC123"), to the right on the same line, or directly below.
  4. Score = label bonus/penalty + format plausibility + OCR confidence.
  5. Best score wins; weak or ambiguous results are flagged, not trusted.
"""
import re
from dataclasses import dataclass, field

OK_SCORE = 6.0            # >= this: confident
LOW_SCORE = 3.0           # >= this: returned, but flagged "low_confidence"
AMBIGUITY_MARGIN = 1.0    # top two within this margin: flagged "low_confidence"
MIN_OCR_CONF = 0.5        # below this OCR confidence a serial is never "ok"

_SEP = r"\s*[:;#.\-]?\s*"

SERIAL_LABEL = re.compile(
    r"(?<![A-Z0-9])(?:S\s*/\s*N|S\.\s*N\.?|SER\.?\s*NO\.?|SN|"
    r"SERIAL\s*(?:NO\.?|NUMBER|NUM\.?|#)?|SERVICE\s*TAG|SVC\s*TAG)(?![A-Z0-9])" + _SEP
)

# Labels for other identifiers that are NOT the serial number
OTHER_LABEL = re.compile(
    r"(?<![A-Z0-9])(?:MODEL(?:\s*(?:NO\.?|NUMBER))?|MOD\.?|P\s*/\s*N|PN|"
    r"PART(?:\s*(?:NO\.?|NUMBER))?|MAC(?:\s*ADDR(?:ESS)?)?|LOT(?:\s*(?:NO\.?|NUMBER))?|"
    r"EXPRESS\s*SERVICE\s*CODE|BATCH|FCC(?:\s*ID)?|IC|UPC|EAN|IMEI|DATE|MFG|MFD|REV|VER|SKU|"
    r"ASSET(?:\s*(?:TAG|NO\.?|NUMBER))?)(?![A-Z0-9])" + _SEP
)

TOKEN = re.compile(r"[A-Z0-9][A-Z0-9\-]*[A-Z0-9]")
_UNIT = re.compile(r"^\d+(?:[.\-]\d+)*(?:MM|CM|MP|GB|TB|MB|KB|MHZ|GHZ|HZ|V|A|W|KG|G|MAH|WH)$")


@dataclass
class Box:
    text: str
    conf: float
    left: float
    right: float
    top: float
    bottom: float
    labels: list = field(default_factory=list)   # (start, end, kind, name)

    @property
    def h(self):
        return max(self.bottom - self.top, 1.0)

    @property
    def cy(self):
        return (self.top + self.bottom) / 2

    def trailing_label(self):
        """Label with nothing after it, so its value is probably in another box."""
        if not self.labels:
            return None
        last = self.labels[-1]
        return last if not self.text[last[1]:].strip(" :;#.-") else None


def _make_boxes(results):
    boxes = []
    for bbox, text, conf in results:
        text = " ".join(str(text).upper().split())
        if not text:
            continue
        xs = [float(p[0]) for p in bbox]
        ys = [float(p[1]) for p in bbox]
        box = Box(text, float(conf), min(xs), max(xs), min(ys), max(ys))
        found = []
        for m in SERIAL_LABEL.finditer(text):
            found.append((m.start(), m.end(), "serial", m.group().strip(" :;#.-")))
        for m in OTHER_LABEL.finditer(text):
            found.append((m.start(), m.end(), "other", m.group().strip(" :;#.-")))
        found.sort()
        last_end = -1
        for lab in found:                      # drop overlapping matches
            if lab[0] >= last_end:
                box.labels.append(lab)
                last_end = lab[1]
        boxes.append(box)
    return boxes


def _link_label(box, boxes):
    """Find the nearest label box to the left (same line) or above this box."""
    best = None
    for other in boxes:
        if other is box:
            continue
        lab = other.trailing_label()
        if lab is None:
            continue
        h = max(box.h, other.h)
        same_row = abs(box.cy - other.cy) <= 0.6 * h
        gap = box.left - other.right
        if same_row and -0.5 * h <= gap <= 8 * h:
            dist, rel = max(gap, 0) / h, "right"
        else:
            vgap = box.top - other.bottom
            aligned = box.left <= other.right + 2 * h and box.right >= other.left - 2 * h
            if not same_row and aligned and -0.3 * h <= vgap <= 2.0 * h:
                dist, rel = 1.5 + max(vgap, 0) / h, "below"
            else:
                continue
        if best is None or dist < best[0]:
            best = (dist, lab[2], lab[3], rel)
    return best


def _plausible(tok):
    core = tok.replace("-", "")
    return 5 <= len(core) <= 30 and any(c.isdigit() for c in core) and not _UNIT.match(tok)


def _format_score(tok):
    core = tok.replace("-", "")
    n = len(core)
    digits = sum(c.isdigit() for c in core)
    letters = sum(c.isalpha() for c in core)
    s = 0.0
    if 8 <= n <= 14:
        s += 1.5
    elif 6 <= n <= 7 or 15 <= n <= 20:
        s += 0.5
    elif n < 6:
        s -= 1.5
    else:
        s -= 1.0
    if letters and digits:
        s += 1.0
    else:
        s += 0.3 if n >= 8 else -0.5
    if tok.count("-") > 2:
        s -= 1.0
    if digits / n < 0.3:
        s -= 1.0
    return s


def extract_serial(results):
    boxes = _make_boxes(results)
    cands = {}
    for box in boxes:
        for m in TOKEN.finditer(box.text):
            tok = m.group()
            if not _plausible(tok):
                continue
            conf = min(max(box.conf, 0.0), 1.0)
            score = 2.0 * conf
            reasons = [f"ocr_conf={conf:.2f}"]

            prev = [lab for lab in box.labels if lab[1] <= m.start()]
            if prev:
                kind, name, rel, dist = prev[-1][2], prev[-1][3], "same_box", 0.0
                # A label belongs to its adjacent value, not every later identifier.
                if TOKEN.search(box.text[prev[-1][1]:m.start()]):
                    kind = name = rel = None
            else:
                link = _link_label(box, boxes)
                kind = name = rel = None
                dist = 0.0
                if link:
                    dist, kind, name, rel = link

            if kind == "serial":
                score += {"same_box": 5.0, "right": 4.5, "below": 3.5}[rel] - min(0.2 * dist, 1.0)
                reasons.append(f"label:{name}({rel})")
            elif kind == "other":
                score -= 4.0
                reasons.append(f"decoy:{name}({rel})")
            else:
                reasons.append("no_label")

            score += _format_score(tok)
            if tok not in cands or score > cands[tok]["score"]:
                cands[tok] = {"value": tok, "score": score, "reasons": reasons, "conf": conf}

    ranked = sorted(cands.values(), key=lambda c: -c["score"])
    shown = [
        {"value": c["value"], "score": round(c["score"], 2), "reasons": c["reasons"]}
        for c in ranked[:3] if c["score"] >= 2.0
    ]

    if not ranked or ranked[0]["score"] < LOW_SCORE:
        return {"status": "not_detected", "serial": None, "confidence": 0.0, "candidates": shown}

    top = ranked[0]
    status = "ok" if top["score"] >= OK_SCORE else "low_confidence"
    if top["conf"] < MIN_OCR_CONF:
        status = "low_confidence"          # the OCR itself was unsure about these characters
    if (status == "ok" and len(ranked) > 1 and ranked[1]["score"] >= LOW_SCORE
            and top["score"] - ranked[1]["score"] < AMBIGUITY_MARGIN):
        status = "low_confidence"          # two similar candidates: let the user choose
    return {
        "status": status,
        "serial": top["value"],
        "confidence": round(min(1.0, max(0.0, top["score"] / 10)), 2),
        "candidates": shown,
    }
