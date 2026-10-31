from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from engine import evidence as ev
from engine.models import PricePoint

NOW = datetime(2026, 10, 31, 16, 0, tzinfo=timezone.utc)

# Real readings, 31 Oct 2026
FW_ROWS = [
    {"range_bps": "350-375", "prob": 0}, {"range_bps": "375-400", "prob": 0.293},
    {"range_bps": "400-425", "prob": 0.707}, {"range_bps": "425-450", "prob": 0},
    {"range_bps": "450-475", "prob": 0},
]
PM = {-50: 0.004, -25: 0.008, 0: 0.275, 25: 0.705, 50: 0.016}


def at(h, m=0):
    return NOW.replace(hour=h, minute=m)


def art(t, d, url, headline=None):
    return ev.Article("X", headline or url, url, t, d, "quote")


class FedWatchTest(unittest.TestCase):
    def test_ranges_to_changes(self):
        fw = ev.fedwatch_by_change(FW_ROWS, 375)
        self.assertAlmostEqual(fw[0], 0.293)
        self.assertAlmostEqual(fw[25], 0.707)
        self.assertAlmostEqual(fw[-25], 0.0)
        self.assertAlmostEqual(fw[50], 0.0)  # 425-450 and 450-475 folded into +50

    def test_real_gap_is_ok(self):
        fw = ev.fedwatch_by_change(FW_ROWS, 375)
        gaps = ev.fedwatch_gaps(PM, fw)
        self.assertAlmostEqual(gaps[0], -1.8)
        self.assertAlmostEqual(gaps[25], -0.2)
        c = ev.check_fedwatch(gaps, 0, fw[0])
        self.assertEqual(c.status, "ok")
        self.assertIn("29%", c.detail)

    def test_normalize_percent_units(self):
        rows = ev.normalize_fedwatch([{"range_bps": "3.75-4.00", "prob": 29.3}, {"range_bps": "4.00-4.25", "prob": 70.7}])
        self.assertEqual(rows, [{"range_bps": "375-400", "prob": 0.293}, {"range_bps": "400-425", "prob": 0.707}])
        self.assertEqual(ev.normalize_fedwatch(FW_ROWS)[1], {"range_bps": "375-400", "prob": 0.293})

    def test_normalize_rejects_non_table(self):
        with self.assertRaises(ValueError):
            ev.normalize_fedwatch([{"range_bps": "375-400", "prob": 0.2}])

    def test_big_gap_is_bad(self):
        c = ev.check_fedwatch({0: -10.0, 25: 9.0}, 0, 0.4)
        self.assertEqual(c.status, "bad")


class NewsTest(unittest.TestCase):
    def flat_history(self):
        return [PricePoint(at(h), 0.64) for h in range(9, 16)]

    def test_two_flat_same_direction_is_unreacted(self):
        arts = [art(at(12, 2), -1, "a"), art(at(12, 20), -1, "b")]
        out, check = ev.analyse_news(arts, self.flat_history(), NOW)
        self.assertEqual([a.reaction for a in out], ["unreacted", "unreacted"])
        self.assertEqual(check.status, "warn")

    def test_single_flat_article_is_not_flagged(self):
        out, check = ev.analyse_news([art(at(12), -1, "a")], self.flat_history(), NOW)
        self.assertEqual(out[0].reaction, "flat")
        self.assertEqual(check.status, "ok")

    def test_far_apart_articles_do_not_cluster(self):
        arts = [art(at(10), -1, "a"), art(at(13), -1, "b")]
        out, check = ev.analyse_news(arts, self.flat_history(), NOW)
        self.assertEqual([a.reaction for a in out], ["flat", "flat"])
        self.assertEqual(check.status, "ok")

    def test_reacted_and_counter(self):
        hist = [PricePoint(at(11), 0.60), PricePoint(at(12, 30), 0.65)]
        out, _ = ev.analyse_news([art(at(12), 1, "up"), art(at(12, 1), -1, "down")], hist, NOW)
        by_url = {a.url: a for a in out}
        self.assertEqual(by_url["up"].reaction, "reacted")
        self.assertAlmostEqual(by_url["up"].delta_p_pts, 5.0)
        self.assertEqual(by_url["down"].reaction, "counter")

    def test_date_only_article_is_not_measured(self):
        hist = [PricePoint(at(h), 0.5 + h / 100) for h in range(0, 16)]
        out, _ = ev.analyse_news([art(NOW.replace(hour=0), 1, "d")], hist, NOW)
        self.assertEqual((out[0].reaction, out[0].delta_p_pts), ("date_only", None))

    def test_pending_inside_window(self):
        out, _ = ev.analyse_news([art(NOW - timedelta(minutes=10), 1, "new")], self.flat_history(), NOW)
        self.assertEqual(out[0].reaction, "pending")

    def test_syndicated_story_counts_once(self):
        arts = [
            art(at(12), -1, "reuters", "Fed officials signal patience on cuts"),
            art(at(12, 5), -1, "yahoo", "Fed officials signal patience on cuts."),
        ]
        out, check = ev.analyse_news(arts, self.flat_history(), NOW)
        self.assertEqual(len(out), 1)
        self.assertEqual(check.status, "ok")  # one source can't make a cluster

    def test_no_articles(self):
        _, check = ev.analyse_news([], [], NOW)
        self.assertEqual((check.status, check.detail), ("ok", "no relevant news"))


class SentimentTest(unittest.TestCase):
    def test_recency_weighted(self):
        arts = [art(NOW - timedelta(hours=1), -1, "a"), art(NOW - timedelta(hours=1), -1, "b"),
                art(NOW - timedelta(hours=40), 1, "c")]
        s = ev.sentiment(arts, NOW)
        self.assertEqual(s["label"], "leans NO")
        self.assertEqual(s["n_articles"], 3)

    def test_old_articles_ignored(self):
        s = ev.sentiment([art(NOW - timedelta(hours=72), 1, "a")], NOW)
        self.assertEqual(s, {"value": 0.0, "label": "mixed", "n_articles": 0})


class AccuracyTest(unittest.TestCase):
    def test_real_pm_page_reading(self):
        # TinyFish read polymarket.com: 0.28 / 0.71; API mids: 0.275 / 0.705
        acc = ev.agent_accuracy([(0.28, 0.275), (0.71, 0.705), (0.016, 0.016)])
        self.assertEqual(acc, {"value": 1.0, "checks": 3})

    def test_misread(self):
        self.assertFalse(ev.agent_match(0.30, 0.275))
        self.assertEqual(ev.agent_accuracy([]), {"value": None, "checks": 0})


if __name__ == "__main__":
    unittest.main()
