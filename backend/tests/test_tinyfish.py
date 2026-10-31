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


class RequestTest(unittest.TestCase):
    def test_json_schema_conversion(self):
        from agent.tinyfish import to_json_schema
        js = to_json_schema({"meeting_date": "str", "probabilities": [{"range_bps": "str", "prob": "float"}]})
        self.assertEqual(js["type"], "object")
        self.assertEqual(js["required"], ["meeting_date", "probabilities"])
        item = js["properties"]["probabilities"]["items"]
        self.assertEqual(item["properties"]["prob"], {"type": "number"})
        self.assertEqual(to_json_schema("int"), {"type": "integer"})
        self.assertEqual(js["properties"]["probabilities"]["minItems"], 1)
        self.assertNotIn("minItems", to_json_schema([{"a": "str"}], allow_empty=True))

    def test_empty_list_rejected_unless_allowed(self):
        with self.assertRaisesRegex(SchemaError, "empty"):
            validate({"outcomes": []}, {"outcomes": [{"name": "str"}]})
        validate({"items": []}, {"items": [{"a": "str"}]}, allow_empty=True)

    def test_request_body_options(self):
        from agent.tinyfish import request_body
        src = {"url": "https://x", "goal": " g \n", "schema": {"a": "str"}, "max_duration_seconds": 240}
        body = request_body(src)
        self.assertTrue(body["goal"].startswith("g\nReturn JSON matching"))
        self.assertEqual(body["agent_config"], {"max_duration_seconds": 240})
        self.assertNotIn("output_schema", body)
        self.assertIn("output_schema", request_body({**src, "strict_schema": True}))
        without = {k: v for k, v in src.items() if k != "max_duration_seconds"}
        self.assertNotIn("agent_config", request_body(without))

    def test_sources_sorted_by_priority(self):
        from agent.tinyfish import PRIORITIES
        levels = [s.get("priority", "normal") for s in load_sources().values()]
        self.assertEqual(levels, sorted(levels, key=PRIORITIES.index))


class SchedulerTest(unittest.TestCase):
    def test_due_sources_respects_priority_intervals(self):
        from store import due_sources
        sources = {"a": {"priority": "high"}, "b": {"priority": "low"}, "c": {}}
        now = 10_000.0
        # all ran 20 min ago: high (15) and normal (15) are due, low (60) is not
        last = {k: now - 20 * 60 for k in sources}
        self.assertEqual(due_sources(sources, last, now), ["a", "c"])
        self.assertEqual(due_sources(sources, {}, now), ["a", "b", "c"])



class JumpTest(unittest.TestCase):
    def setUp(self):
        import tempfile
        from pathlib import Path
        from agent import tinyfish as t
        self.t = t
        self.orig = t.CACHE
        t.CACHE = Path(tempfile.mkdtemp()) / "cache.json"
        t._write_cache("fw", {"result": {"probabilities": [{"range_bps": "375-400", "prob": 0.3}, {"range_bps": "400-425", "prob": 0.7}]}})
        self.src = {"confirm_jump_pts": 15}
        self.jumped = {"probabilities": [{"range_bps": "375-400", "prob": 0.3}, {"range_bps": "400-425", "prob": 0.34}, {"range_bps": "425-450", "prob": 0.36}]}

    def tearDown(self):
        self.t.CACHE = self.orig

    def test_small_move_accepted(self):
        small = {"probabilities": [{"range_bps": "375-400", "prob": 0.25}, {"range_bps": "400-425", "prob": 0.75}]}
        self.t._check_jump("fw", self.src, small)

    def test_big_move_needs_confirmation(self):
        with self.assertRaises(self.t.UnconfirmedJump):
            self.t._check_jump("fw", self.src, self.jumped)
        self.assertIn("pending", self.t.read_cache()["fw"])
        self.t._check_jump("fw", self.src, self.jumped)  # second agreeing read -> accepted

    def test_no_limit_means_no_check(self):
        self.t._check_jump("fw", {}, self.jumped)

if __name__ == "__main__":
    unittest.main()
