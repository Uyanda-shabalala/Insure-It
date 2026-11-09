import ast
import unittest
from pathlib import Path
from extractor import extract_serial


def box(text, conf=.99):
    return ([[0, 0], [300, 0], [300, 20], [0, 20]], text, conf)


class ExtractorTests(unittest.TestCase):
    def test_label_applies_only_to_adjacent_value(self):
        out = extract_serial([box("SN: A1B2C DELL2024")])
        self.assertEqual(out["serial"], "A1B2C")

    def test_express_code_is_rejected(self):
        out = extract_serial([box("EXPRESS SERVICE CODE: 12345678901")])
        self.assertEqual(out["status"], "not_detected")

    def test_weak_ocr_requires_review(self):
        self.assertEqual(extract_serial([box("SN: AB123456", .1)])["status"], "low_confidence")

    def test_empty(self):
        self.assertIsNone(extract_serial([])["serial"])

    def test_later_accepted_pass_wins_over_higher_ambiguous_score(self):
        # Load the actual orchestration function without importing EasyOCR/model files.
        tree = ast.parse(Path(__file__).with_name("ocr_service.py").read_text())
        run_node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "run")
        outputs = iter([
            dict(status="low_confidence", serial="WRONG123", candidates=[dict(score=9.5)]),
            dict(status="ok", serial="RIGHT123", candidates=[dict(score=8.5)]),
        ])
        scope = {"AUTO_ORDER": ["original", "enhanced"],
                 "ocr_pass": lambda img, name: [], "extract_serial": lambda results: next(outputs)}
        exec(compile(ast.Module(body=[run_node], type_ignores=[]), "ocr_service.py", "exec"), scope)
        best, passes = scope["run"](None, "auto")
        self.assertEqual(best["serial"], "RIGHT123")
        self.assertEqual(len(passes), 2)


if __name__ == "__main__":
    unittest.main()
