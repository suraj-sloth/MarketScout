"""Uses planning.md §2/§5 worked examples. Run: python -m unittest (or pytest) from backend/."""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from engine.models import Book, Level, PricePoint
from engine import quality as q

NOW = datetime(2026, 10, 31, 14, 0, tzinfo=timezone.utc)


def book(bids, asks):
    return Book(bids=[Level(p, s) for p, s in bids], asks=[Level(p, s) for p, s in asks])


# §2.2 example YES book, plus a matching NO book (0.34 / 0.38)
YES = book([(0.62, 1000), (0.61, 3000)], [(0.66, 1500), (0.67, 2000)])
NO = book([(0.34, 1000)], [(0.38, 1000)])


class ProbabilityTest(unittest.TestCase):
    def test_mid_and_spread(self):
        self.assertAlmostEqual(q.mid(YES), 0.64)
        self.assertAlmostEqual(q.spread_pts(YES), 4.0)

    def test_p_yes_uses_both_books(self):
        self.assertAlmostEqual(q.p_yes_from_no(NO), 0.64)
        self.assertAlmostEqual(q.p_yes(YES, NO), 0.64)

    def test_p_yes_yes_book_only(self):
        self.assertAlmostEqual(q.p_yes(YES), 0.64)

    def test_unsorted_levels_are_sorted(self):
        b = book([(0.61, 1), (0.62, 1)], [(0.67, 1), (0.66, 1)])
        self.assertEqual((b.best_bid, b.best_ask), (0.62, 0.66))

    def test_empty_book(self):
        self.assertIsNone(q.mid(Book()))
        self.assertIsNone(q.p_yes(Book(), Book()))
        self.assertEqual(q.check_spread(Book()).status, "bad")


class DepthTest(unittest.TestCase):
    def test_depth_within_band(self):
        # all four levels are within 0.05 of 0.64
        expected = 0.62 * 1000 + 0.61 * 3000 + 0.66 * 1500 + 0.67 * 2000
        self.assertAlmostEqual(q.depth_usd(YES), expected)

    def test_market_depth_counts_both_books(self):
        # 2% market: YES side is pennies, NO side holds the dollars
        yes = book([(0.018, 1000)], [(0.020, 1000)])
        no = book([(0.980, 20000)], [(0.982, 20000)])
        self.assertAlmostEqual(q.market_depth_usd(yes, no), 18 + 20 + 980 * 20 + 982 * 20)
        self.assertEqual(q.check_depth(yes).status, "bad")
        self.assertEqual(q.check_depth(yes, no).status, "ok")

    def test_depth_excludes_far_levels(self):
        b = book([(0.62, 1000), (0.40, 99999)], [(0.66, 1000)])
        self.assertAlmostEqual(q.depth_usd(b), 620 + 660)


class CoherenceTest(unittest.TestCase):
    def test_coherent(self):
        self.assertAlmostEqual(q.incoherence_pts(YES, NO), 0.0)
        self.assertAlmostEqual(q.overround(YES, NO), 0.04)
        self.assertEqual(q.check_coherence(YES, NO).status, "ok")

    def test_incoherent_beyond_spread(self):
        no = book([(0.24, 100)], [(0.26, 100)])  # implies 75% vs YES 64%
        self.assertEqual(q.check_coherence(YES, no).status, "bad")

    def test_negative_overround(self):
        no = book([(0.30, 100)], [(0.32, 100)])  # 0.66 + 0.32 < 1
        c = q.check_coherence(YES, no)
        self.assertEqual(c.status, "bad")
        self.assertIn("< $1", c.detail)


class FreshnessTest(unittest.TestCase):
    def series(self, *pairs):
        return [PricePoint(NOW - timedelta(minutes=m), p) for m, p in pairs]

    def test_last_change(self):
        h = self.series((120, 0.66), (60, 0.65), (50, 0.64), (10, 0.64))
        self.assertEqual(q.last_change(h), NOW - timedelta(minutes=50))

    def test_never_changed_uses_first_point(self):
        h = self.series((600, 0.5), (300, 0.5))
        self.assertEqual(q.last_change(h), NOW - timedelta(minutes=600))
        self.assertEqual(q.check_freshness(h, NOW).detail, "no change in 10h+ of history")

    def test_grades(self):
        self.assertEqual(q.check_freshness(self.series((60, .6), (50, .5)), NOW).status, "ok")
        self.assertEqual(q.check_freshness(self.series((200, .6), (180, .5)), NOW).status, "warn")
        c = q.check_freshness(self.series((600, .6), (570, .5)), NOW)
        self.assertEqual((c.status, c.detail), ("bad", "changed 9h 30m ago"))

    def test_stable_deep_market_is_not_stale(self):
        deep = book([(0.27, 50000)], [(0.28, 50000)])
        h = self.series((700, .27), (650, .28))
        c = q.check_freshness(h, NOW, deep)
        self.assertEqual(c.status, "ok")
        self.assertIn("stable", c.detail)
        self.assertEqual(q.check_freshness(h, NOW, YES).status, "bad")  # 4-pt spread, thin


class GradeTest(unittest.TestCase):
    def test_spread_grades(self):
        self.assertEqual(q.check_spread(book([(0.50, 1)], [(0.52, 1)])).status, "ok")
        self.assertEqual(q.check_spread(YES).status, "warn")
        self.assertEqual(q.check_spread(book([(0.29, 1)], [(0.51, 1)])).status, "bad")

    def test_depth_grades(self):
        self.assertEqual(q.check_depth(YES).status, "warn")  # ~$4.8k
        self.assertEqual(q.check_depth(book([(0.5, 30000)], [(0.51, 1)])).status, "ok")
        self.assertEqual(q.check_depth(book([(0.5, 100)], [(0.51, 100)])).status, "bad")


if __name__ == "__main__":
    unittest.main()
