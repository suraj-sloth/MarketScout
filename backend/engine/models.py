"""Plain data types the engine works on. Stdlib only so the engine stays pure."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class Level:
    price: float
    size: float  # shares


@dataclass
class Book:
    """Order book for one outcome token. Bids high->low, asks low->high."""

    bids: list[Level] = field(default_factory=list)
    asks: list[Level] = field(default_factory=list)
    ts: datetime | None = None

    def __post_init__(self) -> None:
        self.bids = sorted(self.bids, key=lambda l: l.price, reverse=True)
        self.asks = sorted(self.asks, key=lambda l: l.price)

    @property
    def best_bid(self) -> float | None:
        return self.bids[0].price if self.bids else None

    @property
    def best_ask(self) -> float | None:
        return self.asks[0].price if self.asks else None


@dataclass(frozen=True)
class PricePoint:
    t: datetime
    p: float


@dataclass(frozen=True)
class Check:
    name: str
    status: str  # "ok" | "warn" | "bad"
    detail: str
