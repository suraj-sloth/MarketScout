"""Paper trading: simulated fills against the live order book, and the rules
that decide when to trade. Pure functions; trader.py wires them to live data.
No real orders are ever placed."""

from __future__ import annotations

from dataclasses import dataclass

from engine.models import Book


@dataclass(frozen=True)
class Fill:
    shares: float
    cost_usd: float
    avg_price: float
    slippage_pts: float  # avg price vs best ask, in probability points
    complete: bool  # False if the book ran out before the full size filled


def fill_buy(book: Book, usd: float) -> Fill | None:
    """Spend `usd` buying from the asks, best price first."""
    if not book.asks:
        return None
    remaining, shares, cost = usd, 0.0, 0.0
    for level in book.asks:
        take = min(remaining, level.price * level.size)
        shares += take / level.price
        cost += take
        remaining -= take
        if remaining <= 1e-9:
            break
    avg = cost / shares
    return Fill(shares, cost, avg, (avg - book.best_ask) * 100, remaining <= 1e-9)


def mark_value(book: Book, shares: float) -> float | None:
    """What the position would sell for now: walk the bids."""
    if not book.bids:
        return None
    remaining, value = shares, 0.0
    for level in book.bids:
        take = min(remaining, level.size)
        value += take * level.price
        remaining -= take
        if remaining <= 1e-9:
            break
    return value


# --- rules ------------------------------------------------------------------

@dataclass(frozen=True)
class Decision:
    rule: str
    event_id: str
    action: str  # "buy" | "skip"
    side: str | None  # "YES" | "NO"
    size_usd: float
    reason: str


def gate(verdict: str, accuracy: float | None, from_cache: bool, min_accuracy: float) -> str | None:
    """Reason to refuse any trade, or None if confidence is good enough."""
    if verdict == "unreliable":
        return "market verdict is unreliable"
    if accuracy is None or accuracy < min_accuracy:
        return f"agent accuracy {('n/a' if accuracy is None else f'{accuracy:.0%}')} below {min_accuracy:.0%}"
    if from_cache:
        return "TinyFish reading is from cache, not a fresh run"
    return None


def fedwatch_rule(event_id: str, gap_pts: float, threshold_pts: float, size_usd: float) -> Decision:
    """gap = Polymarket - FedWatch. FedWatch higher -> market looks cheap -> buy YES."""
    if abs(gap_pts) < threshold_pts:
        return Decision("fedwatch_gap", event_id, "skip", None, 0,
                        f"gap {gap_pts:+.1f} pts is within ±{threshold_pts:.0f}")
    side = "YES" if gap_pts < 0 else "NO"
    return Decision("fedwatch_gap", event_id, "buy", side, size_usd,
                    f"FedWatch {'above' if gap_pts < 0 else 'below'} Polymarket by {abs(gap_pts):.1f} pts")


def news_rule(event_id: str, unreacted_directions: list[int], size_usd: float) -> Decision:
    """One cluster of same-direction unreacted articles -> buy that direction.
    Conflicting clusters -> no trade."""
    dirs = set(unreacted_directions)
    if not dirs:
        return Decision("unreacted_news", event_id, "skip", None, 0, "no unreacted news cluster")
    if len(dirs) > 1:
        return Decision("unreacted_news", event_id, "skip", None, 0, "unreacted news points both ways")
    d = dirs.pop()
    side = "YES" if d > 0 else "NO"
    return Decision("unreacted_news", event_id, "buy", side, size_usd,
                    f"{len(unreacted_directions)} unreacted articles say YES {'more' if d > 0 else 'less'} likely")
