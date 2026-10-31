from __future__ import annotations

import unittest

from agent.tinyfish import SchemaError, load_sources, validate

# Real FedWatch result from TinyFish, 31 Oct 2026 (trimmed).
FEDWATCH = {
    "meeting_date": "2026-12-09",
    "probabilities": [
        {"range_bps": "375-400", "prob": 0.293},
        {"range_bps": "400-425", "prob": 0.707},
        {"range_bps": "425-450", "prob": 0},
    ],
}


class ValidateTest(unittest.TestCase):
    def setUp(self):
        self.schema = load_sources()["fedwatch"]["schema"]

    def test_real_result_passes(self):
        validate(FEDWATCH, self.schema)

    def test_missing_field(self):
        with self.assertRaises(SchemaError):
            validate({"probabilities": []}, self.schema)

    def test_wrong_type_in_list(self):
        bad = {"meeting_date": "2026-12-09", "probabilities": [{"range_bps": "375-400", "prob": "29%"}]}
        with self.assertRaisesRegex(SchemaError, r"probabilities\[0\]\.prob"):
            validate(bad, self.schema)

    def test_bool_is_not_a_number(self):
        with self.assertRaises(SchemaError):
            validate({"x": True}, {"x": "int"})


if __name__ == "__main__":
    unittest.main()
