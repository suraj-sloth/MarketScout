from __future__ import annotations

import unittest

from engine import paper as pp
from engine.models import Book, Level


def book(bids, asks):
    return Book(bids=[Level(p, s) for p, s in bids], asks=[Level(p, s) for p, s in asks])


B = book([(0.69, 500), (0.68, 1000)], [(0.70, 300), (0.71, 1000)])


class FillTest(unittest.TestCase):
    def test_walks_levels(self):
        f = pp.fill_buy(B, 500)
        # 300 shares @0.70 = $210, then $290 @0.71 = 408.45 shares
        self.assertAlmostEqual(f.shares, 300 + 290 / 0.71)
        self.assertAlmostEqual(f.cost_usd, 500)
        self.assertGreater(f.avg_price, 0.70)
        self.assertGreater(f.slippage_pts, 0)
        self.assertTrue(f.complete)

    def test_book_runs_out(self):
        f = pp.fill_buy(book([], [(0.5, 10)]), 100)
        self.assertAlmostEqual(f.cost_usd, 5)
        self.assertFalse(f.complete)

    def test_empty_book(self):
        self.assertIsNone(pp.fill_buy(Book(), 100))

    def test_mark_value_walks_bids(self):
        self.assertAlmostEqual(pp.mark_value(B, 600), 500 * 0.69 + 100 * 0.68)
        self.assertIsNone(pp.mark_value(Book(), 1))


class RuleTest(unittest.TestCase):
    def test_gate(self):
        self.assertIsNone(pp.gate("good", 1.0, False, 0.8))
        self.assertIn("unreliable", pp.gate("unreliable", 1.0, False, 0.8))
        self.assertIn("accuracy", pp.gate("good", 0.5, False, 0.8))
        self.assertIn("n/a", pp.gate("good", None, False, 0.8))
        self.assertIn("cache", pp.gate("check", 1.0, True, 0.8))

    def test_fedwatch_rule(self):
        self.assertEqual(pp.fedwatch_rule("f", -1.2, 3, 500).action, "skip")
        d = pp.fedwatch_rule("f", -5.0, 3, 500)
        self.assertEqual((d.action, d.side, d.size_usd), ("buy", "YES", 500))
        self.assertEqual(pp.fedwatch_rule("f", 4.0, 3, 500).side, "NO")

    def test_news_rule(self):
        self.assertEqual(pp.news_rule("e", [], 250).action, "skip")
        self.assertEqual(pp.news_rule("e", [1, -1], 250).action, "skip")
        d = pp.news_rule("e", [-1, -1], 250)
        self.assertEqual((d.action, d.side), ("buy", "NO"))


if __name__ == "__main__":
    unittest.main()
