"""Build API responses (shapes in contract/*.json) from store state + engine."""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone

from agent import tinyfish
from config import EVENTS, FED_CURRENT_LOWER_BPS, FED_OUTCOMES
from engine import evidence as ev
from engine import quality as q
from engine.models import Check
from engine.verdict import apply_agent_accuracy, verdict
from store import STATE

EVENT_BY_ID = {e["event_id"]: e for e in EVENTS}


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat().replace("+00:00", "Z") if dt else None


def _parse_time(s: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _cached_sources(event_id: str, kind: str) -> list[tuple[dict, dict]]:
    """(source config, cache entry) for this event's sources of one kind."""
    cache = tinyfish.read_cache()
    return [
        (s, cache[s["id"]])
        for s in tinyfish.load_sources().values()
        if s.get("event") == event_id and s.get("kind") == kind and s["id"] in cache
    ]


def _articles(event_id: str) -> list[ev.Article]:
    out = []
    for source, entry in _cached_sources(event_id, "news"):
        for item in entry["result"].get("items", []):
            t = _parse_time(item.get("published_at", ""))
            if t is None or item.get("direction") not in (-1, 0, 1):
                continue  # can't place it in time / unusable label
            out.append(ev.Article(source.get("name", source["id"]),
                                  item["headline"], item["url"], t, item["direction"], item["reason"]))
    return out


def _fedwatch(event_id: str) -> tuple[dict | None, dict | None]:
    """(source config, cache entry) for the event's FedWatch reading, if any."""
    found = _cached_sources(event_id, "outside_view")
    return found[0] if found else (None, None)


def agent_accuracy() -> dict:
    """Compare TinyFish's readings of polymarket.com with the API (§5.9)."""
    labels = {label.lower(): idx for idx, (label, _) in FED_OUTCOMES.items()}
    pairs = []
    for event in EVENTS:
        mids = STATE[event["event_id"]].outcome_mids
        for _, entry in _cached_sources(event["event_id"], "agent_check"):
            for o in entry["result"].get("outcomes", []):
                idx = labels.get(o["name"].lower())
                if idx is not None and idx in mids:
                    pairs.append((float(o["prob"]), mids[idx]))
    return ev.agent_accuracy(pairs)


def _market(event: dict, now: datetime, accuracy: dict) -> dict | None:
    st = STATE[event["event_id"]]
    if st.snap is None:
        return None
    s, meta = st.snap, st.meta
    p = q.p_yes(s.yes_book, s.no_book)

    checks: list[Check] = [
        q.check_spread(s.yes_book),
        q.check_depth(s.yes_book, s.no_book),
        q.check_coherence(s.yes_book, s.no_book),
        q.check_freshness(s.history, now, s.yes_book, s.no_book),
    ]
    if event.get("fed") and st.outcome_mids:
        _, fw = _fedwatch(event["event_id"])
        if fw:
            fw_by_change = ev.fedwatch_by_change(fw["result"]["probabilities"], FED_CURRENT_LOWER_BPS)
            pm_by_change = {FED_OUTCOMES[i][1]: m for i, m in st.outcome_mids.items() if i in FED_OUTCOMES}
            tracked = FED_OUTCOMES[event["market_index"]][1]
            checks.append(ev.check_fedwatch(ev.fedwatch_gaps(pm_by_change, fw_by_change), tracked,
                                            fw_by_change.get(tracked, 0.0)))
    articles, news_check = ev.analyse_news(_articles(event["event_id"]), s.history, now)
    checks.append(news_check)
    checks = apply_agent_accuracy(checks, accuracy["value"])

    def r(x, n=4):
        return None if x is None else round(x, n)

    return {
        "event_id": event["event_id"],
        "question": meta.question,
        "url": f"https://polymarket.com/event/{event['slug']}",
        "end_date": (meta.end_date or "")[:10] or None,
        "p_yes": r(p),
        "yes_bid": s.yes_book.best_bid, "yes_ask": s.yes_book.best_ask,
        "no_bid": s.no_book.best_bid, "no_ask": s.no_book.best_ask,
        "spread_pts": r(q.spread_pts(s.yes_book), 2),
        "depth_usd": round(q.market_depth_usd(s.yes_book, s.no_book)),
        "incoherence_pts": r(q.incoherence_pts(s.yes_book, s.no_book), 2),
        "last_change": _iso(q.last_change(s.history)),
        "verdict": verdict(checks),
        "checks": [asdict(c) for c in checks],
        "sentiment": ev.sentiment(articles, now),
    }


def markets() -> dict:
    now = datetime.now(timezone.utc)
    accuracy = agent_accuracy()
    built = (_market(e, now, accuracy) for e in EVENTS)
    return {"as_of": _iso(now), "agent_accuracy": accuracy, "markets": [m for m in built if m]}


def evidence(event_id: str) -> dict | None:
    event = EVENT_BY_ID.get(event_id)
    st = STATE.get(event_id)
    if event is None or st is None or st.snap is None:
        return None
    now = datetime.now(timezone.utc)
    articles, _ = ev.analyse_news(_articles(event_id), st.snap.history, now)

    fedwatch = None
    source, fw = _fedwatch(event_id)
    if fw:
        by_change = ev.fedwatch_by_change(fw["result"]["probabilities"], FED_CURRENT_LOWER_BPS)
        fedwatch = {
            "p": by_change.get(FED_OUTCOMES[event["market_index"]][1]),
            "meeting_date": fw["result"]["meeting_date"],
            "url": source["url"],
            "ts": fw["ts"],
            "from_cache": True,  # always served from the cache; live runs refresh it
        }

    return {
        "event_id": event_id,
        "price_history": [{"t": _iso(pt.t), "p": pt.p} for pt in st.snap.history],
        "fedwatch": fedwatch,
        "articles": [
            {"source": a.source, "headline": a.headline, "url": a.url, "published_at": _iso(a.published_at),
             "direction": a.direction, "reason": a.reason, "reaction": a.reaction, "delta_p_pts": a.delta_p_pts}
            for a in sorted(articles, key=lambda a: a.published_at, reverse=True)
        ],
    }
