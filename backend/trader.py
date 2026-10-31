"""Automated paper trading. When a TinyFish source finishes a run, evaluate the
rules for its market and simulate any trade against the live order book.
Nothing here places a real order. Ledger: backend/paper_ledger.json."""

from __future__ import annotations

import json
import logging
import threading
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

import service
from agent import tinyfish
from config import PAPER_FEDWATCH_GAP_PTS, PAPER_FEDWATCH_SIZE_USD, PAPER_MIN_ACCURACY, PAPER_NEWS_SIZE_USD
from engine import paper as pp
from store import STATE

log = logging.getLogger("marketscout.paper")
LEDGER = Path(__file__).resolve().parent / "paper_ledger.json"
MAX_DECISIONS = 100
_lock = threading.Lock()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _load() -> dict:
    try:
        return json.loads(LEDGER.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {"positions": [], "decisions": []}


def _save(ledger: dict) -> None:
    ledger["decisions"] = ledger["decisions"][-MAX_DECISIONS:]
    LEDGER.write_text(json.dumps(ledger, indent=1))


def _record(ledger: dict, d: pp.Decision, source_id: str, extra: str = "") -> None:
    ledger["decisions"].append({
        "ts": _now(), "source_id": source_id, "rule": d.rule, "event_id": d.event_id,
        "action": d.action, "side": d.side, "size_usd": d.size_usd,
        "reason": d.reason + (f"; {extra}" if extra else ""),
    })


def _decide(source: dict, result: dict) -> pp.Decision | None:
    event_id = source.get("event")
    event = service.EVENT_BY_ID.get(event_id)
    if event is None:
        return None
    kind = source["kind"]
    if kind == "outside_view":
        fw = service.fedwatch_view(event)
        if fw is None:
            return pp.Decision("fedwatch_gap", event_id, "skip", None, 0, "no FedWatch comparison for this market")
        decision = pp.fedwatch_rule(event_id, fw["gap"], PAPER_FEDWATCH_GAP_PTS, PAPER_FEDWATCH_SIZE_USD)
    elif kind == "news":
        decision = pp.news_rule(event_id, service.unreacted_directions(event_id), PAPER_NEWS_SIZE_USD)
    else:
        return None  # agent_check sources only feed accuracy

    if decision.action == "buy":
        market = service.market_view(event_id)
        accuracy = service.agent_accuracy()["value"]
        blocked = pp.gate(market["verdict"] if market else "unreliable", accuracy,
                          result.get("from_cache", False), PAPER_MIN_ACCURACY)
        if blocked:
            return pp.Decision(decision.rule, event_id, "skip", decision.side, 0,
                               f"{decision.reason}, but {blocked}")
    return decision


def on_source_result(source_id: str, result: dict) -> None:
    """Called after every TinyFish run (scheduled or manual)."""
    source = tinyfish.load_sources().get(source_id)
    if source is None or result.get("status") == "failed":
        return
    decision = _decide(source, result)
    if decision is None:
        return

    with _lock:
        ledger = _load()
        if decision.action == "buy":
            held = any(p["event_id"] == decision.event_id and p["rule"] == decision.rule for p in ledger["positions"])
            snap = STATE[decision.event_id].snap
            book = None if snap is None else (snap.yes_book if decision.side == "YES" else snap.no_book)
            fill = None if book is None else pp.fill_buy(book, decision.size_usd)
            if held:
                _record(ledger, pp.Decision(decision.rule, decision.event_id, "skip", decision.side, 0,
                                            decision.reason), source_id, "already holding a position from this rule")
            elif fill is None:
                _record(ledger, pp.Decision(decision.rule, decision.event_id, "skip", decision.side, 0,
                                            decision.reason), source_id, "no asks in the book")
            else:
                ledger["positions"].append({
                    "id": uuid.uuid4().hex[:8], "opened_at": _now(), "source_id": source_id,
                    "rule": decision.rule, "event_id": decision.event_id,
                    "question": STATE[decision.event_id].meta.question, "side": decision.side,
                    "shares": round(fill.shares, 4), "cost_usd": round(fill.cost_usd, 2),
                    "avg_price": round(fill.avg_price, 4), "slippage_pts": round(fill.slippage_pts, 3),
                    "complete_fill": fill.complete, "reason": decision.reason,
                })
                _record(ledger, decision, source_id,
                        f"filled {fill.shares:,.0f} {decision.side} @ {fill.avg_price:.3f} (paper)")
                log.info("paper buy %s %s $%.0f: %s", decision.event_id, decision.side, fill.cost_usd, decision.reason)
        else:
            _record(ledger, decision, source_id)
        _save(ledger)


def view() -> dict:
    """Positions marked to the live bid, plus the decision log (newest first)."""
    with _lock:
        ledger = _load()
    positions, cost, value = [], 0.0, 0.0
    for p in ledger["positions"]:
        snap = STATE.get(p["event_id"]).snap if p["event_id"] in STATE else None
        book = None if snap is None else (snap.yes_book if p["side"] == "YES" else snap.no_book)
        mark = None if book is None else pp.mark_value(book, p["shares"])
        positions.append({
            **p,
            "mark_value_usd": None if mark is None else round(mark, 2),
            "pnl_usd": None if mark is None else round(mark - p["cost_usd"], 2),
        })
        cost += p["cost_usd"]
        value += mark if mark is not None else p["cost_usd"]
    return {
        "as_of": _now(),
        "mode": "paper",
        "rules": {
            "fedwatch_gap": f"|Polymarket - FedWatch| >= {PAPER_FEDWATCH_GAP_PTS:.0f} pts -> buy FedWatch's side, ${PAPER_FEDWATCH_SIZE_USD:.0f}",
            "unreacted_news": f">= 2 unreacted same-direction articles -> buy that side, ${PAPER_NEWS_SIZE_USD:.0f}",
            "gate": f"skip if verdict unreliable, agent accuracy < {PAPER_MIN_ACCURACY:.0%}, or reading from cache",
        },
        "totals": {"cost_usd": round(cost, 2), "value_usd": round(value, 2), "pnl_usd": round(value - cost, 2),
                   "open_positions": len(positions)},
        "positions": positions,
        "decisions": list(reversed(ledger["decisions"])),
    }


def reset() -> None:
    with _lock:
        _save({"positions": [], "decisions": []})
