"""Tracked events, polling intervals and verdict thresholds (planning.md §5.10)."""

# Polymarket events we track. B2 picks the final list; slugs come from
# polymarket.com/event/<slug>. `market_index` picks one market inside a
# multi-market event. The Fed event has 5 markets (cut 50+, cut 25, no change,
# hike 25, hike 50+); index 2 = "no change", the most liquid, compared with
# FedWatch's hold probability.
EVENTS = [
    {"event_id": "fed-dec", "slug": "fed-decision-in-december-20260729232808632", "market_index": 2},
]

POLL_SECONDS = 5
AGENT_REFRESH_MINUTES = 15

# Depth counts orders within this distance of mid (probability units).
DEPTH_BAND = 0.05

# Thresholds: (ok_max, warn_max). Above warn_max -> bad.
SPREAD_PTS = (3.0, 8.0)
FRESHNESS_HOURS = (1.0, 6.0)
FEDWATCH_GAP_PTS = (3.0, 8.0)
# Depth is "higher is better": ok if >= first, warn if >= second, else bad.
DEPTH_USD = (10_000.0, 1_000.0)

AGENT_MATCH_TOLERANCE_PTS = 2.0
AGENT_MIN_ACCURACY = 0.8
