from __future__ import annotations

import unittest

from engine.models import Check
from engine.verdict import apply_agent_accuracy, verdict

OK = Check("spread", "ok", "")
WARN = Check("depth", "warn", "")
BAD = Check("freshness", "bad", "")
FW = Check("fedwatch_gap", "ok", "gap -1.8 pts")


class VerdictTest(unittest.TestCase):
    def test_levels(self):
        self.assertEqual(verdict([OK, FW]), "good")
        self.assertEqual(verdict([OK, WARN]), "check")
        self.assertEqual(verdict([WARN, BAD]), "unreliable")

    def test_low_accuracy_downgrades_outside_view_only(self):
        out = apply_agent_accuracy([OK, FW], 0.5)
        self.assertEqual([c.status for c in out], ["ok", "warn"])
        self.assertIn("agent accuracy 50%", out[1].detail)

    def test_good_or_unknown_accuracy_keeps_checks(self):
        self.assertEqual(apply_agent_accuracy([FW], 0.9), [FW])
        self.assertEqual(apply_agent_accuracy([FW], None), [FW])


if __name__ == "__main__":
    unittest.main()
