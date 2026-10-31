"""Outside-view checks: FedWatch gap, news reaction, sentiment, agent accuracy
(planning.md §5.6–5.9)."""

from __future__ import annotations

import bisect
import difflib
from dataclasses import dataclass, replace
from datetime import datetime, timedelta

from config import (
    AGENT_MATCH_TOLERANCE_PTS,
    CLUSTER_WINDOW_MIN,
    FEDWATCH_GAP_PTS,
    REACTION_MIN_PTS,
    REACTION_WINDOW_MIN,
    SENTIMENT_HALF_LIFE_H,
    SENTIMENT_LOOKBACK_H,
)
from engine.models import Check, PricePoint
from engine.quality import _grade_low


# --- FedWatch (§5.6) --------------------------------------------------------

def fedwatch_by_change(probabilities: list[dict], current_lower_bps: int, cap_bps: int = 50) -> dict[int, float]:
    """Map FedWatch ranges like "400-425" to rate changes vs the current range.
    Changes beyond +/-cap_bps are folded into the cap bucket ("50+")."""
    out: dict[int, float] = {}
    for row in probabilities:
        lower = int(row["range_bps"].split("-")[0])
        change = max(-cap_bps, min(cap_bps, lower - current_lower_bps))
        out[change] = out.get(change, 0.0) + float(row["prob"])
    return out


def fedwatch_gaps(polymarket: dict[int, float], fedwatch: dict[int, float]) -> dict[int, float]:
    """Polymarket minus FedWatch, in points, for each outcome both sides price."""
    return {c: (polymarket[c] - fedwatch.get(c, 0.0)) * 100 for c in polymarket}


def check_fedwatch(gaps: dict[int, float], tracked_change: int, p_fw_tracked: float) -> Check:
    gap = gaps[tracked_change]
    worst = max(gaps, key=lambda c: abs(gaps[c]))
    detail = f"FedWatch {p_fw_tracked:.0%}, gap {gap:+.1f} pts"
    if worst != tracked_change and abs(gaps[worst]) > abs(gap):
        detail += f"; largest {gaps[worst]:+.1f} pts on {worst:+d} bps"
    return Check("fedwatch_gap", _grade_low(abs(gap), FEDWATCH_GAP_PTS), detail)


# --- news reaction (§5.7) ---------------------------------------------------

@dataclass(frozen=True)
class Article:
    source: str
    headline: str
    url: str
    published_at: datetime
    direction: int  # +1 YES more likely, -1 less likely, 0 neutral
    reason: str
    reaction: str = ""  # reacted | counter | unreacted | flat | neutral | pending | date_only
    delta_p_pts: float | None = None


def dedupe(articles: list[Article], similarity: float = 0.8) -> list[Article]:
    """Same URL or near-identical headline (syndicated wire story) counts once;
    the earliest copy is kept."""
    kept: list[Article] = []
    for a in sorted(articles, key=lambda a: a.published_at):
        if any(a.url == k.url or difflib.SequenceMatcher(None, a.headline.lower(), k.headline.lower()).ratio() >= similarity for k in kept):
            continue
        kept.append(a)
    return kept


def price_at(history: list[PricePoint], t: datetime) -> float | None:
    """Last known price at or before t."""
    points = sorted(history, key=lambda pt: pt.t)
    i = bisect.bisect_right([pt.t for pt in points], t)
    return points[i - 1].p if i else None


def _sign(x: float) -> int:
    return (x > 0) - (x < 0)


def classify(a: Article, history: list[PricePoint], now: datetime) -> Article:
    after = a.published_at + timedelta(minutes=REACTION_WINDOW_MIN)
    if a.direction == 0:
        return replace(a, reaction="neutral")
    if (a.published_at.hour, a.published_at.minute, a.published_at.second) == (0, 0, 0):
        # Source only gave a date; an hour-scale reaction can't be measured.
        return replace(a, reaction="date_only")
    if now < after:
        return replace(a, reaction="pending")
    p0 = price_at(history, a.published_at - timedelta(minutes=5))
    p1 = price_at(history, after)
    if p0 is None or p1 is None:
        return replace(a, reaction="pending")
    delta = (p1 - p0) * 100
    if abs(delta) < REACTION_MIN_PTS:
        label = "flat"
    elif _sign(delta) == a.direction:
        label = "reacted"
    else:
        label = "counter"
    return replace(a, reaction=label, delta_p_pts=round(delta, 2))


def unreacted_clusters(articles: list[Article]) -> list[list[Article]]:
    """Groups of >= 2 same-direction 'flat' articles, each within the cluster
    window of the previous one. Members are relabelled 'unreacted'."""
    clusters: list[list[Article]] = []
    for d in (1, -1):
        flat = sorted((a for a in articles if a.reaction == "flat" and a.direction == d), key=lambda a: a.published_at)
        group: list[Article] = []
        for a in flat:
            if group and a.published_at - group[-1].published_at > timedelta(minutes=CLUSTER_WINDOW_MIN):
                if len(group) >= 2:
                    clusters.append(group)
                group = []
            group.append(a)
        if len(group) >= 2:
            clusters.append(group)
    return clusters


def analyse_news(articles: list[Article], history: list[PricePoint], now: datetime) -> tuple[list[Article], Check]:
    articles = [classify(a, history, now) for a in dedupe(articles)]
    clusters = unreacted_clusters(articles)
    in_cluster = {a.url for c in clusters for a in c}
    articles = [replace(a, reaction="unreacted") if a.url in in_cluster else a for a in articles]

    if not articles:
        return articles, Check("news_reaction", "ok", "no relevant news")
    if not clusters:
        reacted = sum(a.reaction == "reacted" for a in articles)
        directional = sum(a.direction != 0 for a in articles)
        return articles, Check("news_reaction", "ok", f"price followed {reacted} of {directional} articles")
    n = sum(len(c) for c in clusters)
    status = "warn" if len(clusters) == 1 else "bad"
    return articles, Check("news_reaction", status, f"{n} articles, price flat {REACTION_WINDOW_MIN} min")


# --- sentiment (§5.8) — display only, not a verdict input -------------------

def sentiment(articles: list[Article], now: datetime) -> dict:
    recent = [a for a in articles if now - a.published_at <= timedelta(hours=SENTIMENT_LOOKBACK_H)]
    weights = [0.5 ** ((now - a.published_at).total_seconds() / 3600 / SENTIMENT_HALF_LIFE_H) for a in recent]
    total = sum(weights)
    value = sum(w * a.direction for w, a in zip(weights, recent)) / total if total else 0.0
    label = "leans YES" if value > 0.3 else "leans NO" if value < -0.3 else "mixed"
    return {"value": round(value, 2), "label": label, "n_articles": len(recent)}


# --- agent accuracy (§5.9) --------------------------------------------------

def agent_match(p_web: float, p_api: float) -> bool:
    return abs(p_web - p_api) * 100 <= AGENT_MATCH_TOLERANCE_PTS


def agent_accuracy(pairs: list[tuple[float, float]]) -> dict:
    """pairs = (TinyFish reading, API value) for the same outcome."""
    if not pairs:
        return {"value": None, "checks": 0}
    hits = sum(agent_match(w, a) for w, a in pairs)
    return {"value": round(hits / len(pairs), 2), "checks": len(pairs)}
