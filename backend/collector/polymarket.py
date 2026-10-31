"""Polymarket public API -> engine models (planning.md §3).

Endpoints are unauthenticated. Field names follow Polymarket's docs as of
Oct 2026; run `python -m collector.polymarket <slug>` to check them live.
"""

from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone

import httpx

from engine.models import Book, Level, PricePoint

GAMMA = "https://gamma-api.polymarket.com"
CLOB = "https://clob.polymarket.com"
TIMEOUT = httpx.Timeout(10.0)


@dataclass
class MarketMeta:
    question: str
    slug: str
    end_date: str | None
    rules: str
    yes_token: str
    no_token: str


@dataclass
class MarketSnapshot:
    meta: MarketMeta
    yes_book: Book
    no_book: Book
    history: list[PricePoint]
    fetched_at: datetime


def _as_list(v) -> list:
    # Gamma returns some list fields as JSON-encoded strings.
    return json.loads(v) if isinstance(v, str) else list(v or [])


async def fetch_event_market(client: httpx.AsyncClient, slug: str, market_index: int = 0) -> MarketMeta:
    r = await client.get(f"{GAMMA}/events", params={"slug": slug})
    r.raise_for_status()
    events = r.json()
    if not events:
        raise LookupError(f"no Polymarket event with slug {slug!r}")
    m = events[0]["markets"][market_index]

    outcomes = [o.lower() for o in _as_list(m.get("outcomes"))]
    tokens = _as_list(m.get("clobTokenIds"))
    by_outcome = dict(zip(outcomes, tokens))
    return MarketMeta(
        question=m["question"],
        slug=m.get("slug", slug),
        end_date=m.get("endDate"),
        rules=m.get("description", ""),
        yes_token=by_outcome.get("yes", tokens[0]),
        no_token=by_outcome.get("no", tokens[1]),
    )


async def fetch_book(client: httpx.AsyncClient, token_id: str) -> Book:
    r = await client.get(f"{CLOB}/book", params={"token_id": token_id})
    r.raise_for_status()
    data = r.json()
    ts = data.get("timestamp")
    return Book(
        bids=[Level(float(l["price"]), float(l["size"])) for l in data.get("bids", [])],
        asks=[Level(float(l["price"]), float(l["size"])) for l in data.get("asks", [])],
        ts=datetime.fromtimestamp(int(ts) / 1000, timezone.utc) if ts else None,
    )


async def fetch_history(client: httpx.AsyncClient, token_id: str, interval: str = "1d", fidelity_min: int = 5) -> list[PricePoint]:
    r = await client.get(
        f"{CLOB}/prices-history",
        params={"market": token_id, "interval": interval, "fidelity": fidelity_min},
    )
    r.raise_for_status()
    return [
        PricePoint(datetime.fromtimestamp(pt["t"], timezone.utc), float(pt["p"]))
        for pt in r.json().get("history", [])
    ]


async def snapshot(client: httpx.AsyncClient, meta: MarketMeta) -> MarketSnapshot:
    yes_book, no_book, history = await asyncio.gather(
        fetch_book(client, meta.yes_token),
        fetch_book(client, meta.no_token),
        fetch_history(client, meta.yes_token),
    )
    return MarketSnapshot(meta, yes_book, no_book, history, datetime.now(timezone.utc))


def client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=TIMEOUT)


async def _main(slug: str) -> None:
    from engine import quality as q

    async with client() as c:
        meta = await fetch_event_market(c, slug)
        snap = await snapshot(c, meta)
    print(meta.question, "| ends", meta.end_date)
    print(f"YES {snap.yes_book.best_bid} / {snap.yes_book.best_ask}   NO {snap.no_book.best_bid} / {snap.no_book.best_ask}")
    print(f"p_yes {q.p_yes(snap.yes_book, snap.no_book)}  spread {q.spread_pts(snap.yes_book)} pts  depth ${q.depth_usd(snap.yes_book):,.0f}")
    print(f"history points {len(snap.history)}  last change {q.last_change(snap.history)}")


if __name__ == "__main__":
    asyncio.run(_main(sys.argv[1] if len(sys.argv) > 1 else "fed-decision-in-december"))
