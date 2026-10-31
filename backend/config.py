"""Tracked events, polling intervals and verdict thresholds (planning.md §5.10)."""

# Polymarket events we track. B2 picks the final list; slugs come from
# polymarket.com/event/<slug>. `market_index` picks one market inside a
# multi-market event. The Fed event has 5 markets (cut 50+, cut 25, no change,
# hike 25, hike 50+); index 3 = "hike 25 bps" — the market's favourite (~70%),
# deep, and a clear question for news direction ("does this make a hike more
# likely?" — "no change" confused the agent). Compared with FedWatch per outcome.
EVENTS = [
    {"event_id": "fed-dec", "slug": "fed-decision-in-december-20260729232808632", "market_index": 3, "fed": True},
    {"event_id": "btc-150k-dec", "slug": "when-will-bitcoin-hit-150k", "market_index": 4},
    {"event_id": "gov-shutdown-dec", "slug": "government-shutdown-by", "market_index": 1},
]

POLL_SECONDS = 5
# How often each sources.yaml priority is refreshed. High-priority sources also
# run first in every cycle and at startup.
AGENT_REFRESH_MINUTES = {"high": 15, "normal": 15, "low": 60}
AGENT_MAX_PARALLEL = 3

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

# Fed event: Polymarket market_index -> (label on polymarket.com, rate change in bps).
# "50+" buckets collect every FedWatch range at or beyond +/-50.
FED_OUTCOMES = {
    0: ("50+ bps decrease", -50),
    1: ("25 bps decrease", -25),
    2: ("No change", 0),
    3: ("25 bps increase", 25),
    4: ("50+ bps increase", 50),
}
# Current fed funds target range (lower bound, bps). Verify before the demo.
FED_CURRENT_LOWER_BPS = 375

# News reaction (§5.7)
REACTION_WINDOW_MIN = 60
REACTION_MIN_PTS = 1.0
CLUSTER_WINDOW_MIN = 120
SENTIMENT_HALF_LIFE_H = 24
SENTIMENT_LOOKBACK_H = 48
