"""Price-quality metrics for a binary prediction market (planning.md §5.1–5.5)."""

from __future__ import annotations

from datetime import datetime

from config import DEPTH_BAND, DEPTH_USD, FRESHNESS_HOURS, SPREAD_PTS
from engine.models import Book, Check, PricePoint


def mid(book: Book) -> float | None:
    if book.best_bid is None or book.best_ask is None:
        return None
    return (book.best_bid + book.best_ask) / 2


def p_yes_from_no(no_book: Book) -> float | None:
    m = mid(no_book)
    return None if m is None else 1 - m


def p_yes(yes_book: Book, no_book: Book | None = None) -> float | None:
    """Average of the YES-book estimate and the 1 - NO-book estimate (§5.1)."""
    estimates = [mid(yes_book)]
    if no_book is not None:
        estimates.append(p_yes_from_no(no_book))
    estimates = [e for e in estimates if e is not None]
    return sum(estimates) / len(estimates) if estimates else None


def spread_pts(book: Book) -> float | None:
    if book.best_bid is None or book.best_ask is None:
        return None
    return (book.best_ask - book.best_bid) * 100


def market_depth_usd(yes_book: Book, no_book: Book | None = None) -> float:
    """Depth of the whole market: YES and NO books trade the same question, and
    in a 2% market nearly all the dollars sit on the NO side (98c/share)."""
    return depth_usd(yes_book) + (depth_usd(no_book) if no_book is not None else 0.0)


def depth_usd(book: Book, band: float = DEPTH_BAND) -> float:
    """Dollar value of resting orders within `band` of mid, both sides (§5.3)."""
    m = mid(book)
    if m is None:
        return 0.0
    levels = book.bids + book.asks
    return sum(l.price * l.size for l in levels if abs(l.price - m) <= band)


def incoherence_pts(yes_book: Book, no_book: Book) -> float | None:
    a, b = mid(yes_book), p_yes_from_no(no_book)
    if a is None or b is None:
        return None
    return abs(a - b) * 100


def overround(yes_book: Book, no_book: Book) -> float | None:
    if yes_book.best_ask is None or no_book.best_ask is None:
        return None
    return yes_book.best_ask + no_book.best_ask - 1


def last_change(history: list[PricePoint]) -> datetime | None:
    """Time of the most recent price change. If the price never changed, the
    first point is the best lower bound we have."""
    if not history:
        return None
    points = sorted(history, key=lambda pt: pt.t)
    for prev, cur in zip(reversed(points[:-1]), reversed(points)):
        if cur.p != prev.p:
            return cur.t
    return points[0].t


# --- checks (§5.10) ---------------------------------------------------------

def _grade_low(value: float, limits: tuple[float, float]) -> str:
    """Lower is better."""
    ok_max, warn_max = limits
    return "ok" if value <= ok_max else "warn" if value <= warn_max else "bad"


def _grade_high(value: float, limits: tuple[float, float]) -> str:
    """Higher is better."""
    ok_min, warn_min = limits
    return "ok" if value >= ok_min else "warn" if value >= warn_min else "bad"


def _fmt_usd(v: float) -> str:
    if v >= 1_000_000:
        return f"${v / 1_000_000:.1f}M"
    return f"${v / 1000:.0f}k" if v >= 1000 else f"${v:.0f}"


def _fmt_age(hours: float) -> str:
    if hours < 1:
        return f"changed {hours * 60:.0f} min ago"
    h = int(hours)
    return f"changed {h}h {(hours - h) * 60:.0f}m ago"


def check_spread(book: Book) -> Check:
    s = spread_pts(book)
    if s is None:
        return Check("spread", "bad", "empty book")
    return Check("spread", _grade_low(s, SPREAD_PTS), f"{s:.1f} pts")


def check_depth(book: Book, no_book: Book | None = None) -> Check:
    d = market_depth_usd(book, no_book)
    return Check("depth", _grade_high(d, DEPTH_USD), _fmt_usd(d))


def check_coherence(yes_book: Book, no_book: Book) -> Check:
    inc, ovr, spr = incoherence_pts(yes_book, no_book), overround(yes_book, no_book), spread_pts(yes_book)
    if inc is None or ovr is None or spr is None:
        return Check("coherence", "warn", "NO book missing")
    if ovr < 0:
        return Check("coherence", "bad", f"YES + NO asks cost {1 + ovr:.2f} < $1")
    if inc > spr:
        a, b = mid(yes_book), p_yes_from_no(no_book)
        return Check("coherence", "bad", f"YES says {a:.0%}, NO says {b:.0%}")
    return Check("coherence", "ok", "YES and NO agree")


def check_freshness(history: list[PricePoint], now: datetime, book: Book | None = None,
                    no_book: Book | None = None) -> Check:
    """A price that hasn't moved is only suspicious if the book is also wide or
    thin; a tight, deep market can sit at the same 1-cent tick for hours."""
    lc = last_change(history)
    if lc is None:
        return Check("freshness", "warn", "no price history")
    hours = (now - lc).total_seconds() / 3600
    status = _grade_low(hours, FRESHNESS_HOURS)
    # last_change falls back to the first point when the price never moved.
    detail = f"no change in {int(hours)}h+ of history" if len({pt.p for pt in history}) == 1 else _fmt_age(hours)
    if status != "ok" and book is not None and check_spread(book).status == "ok" and check_depth(book, no_book).status == "ok":
        return Check("freshness", "ok", f"{detail} (stable: tight, deep book)")
    return Check("freshness", status, detail)
