"""Combine checks into a verdict (planning.md §5.10)."""

from __future__ import annotations

from dataclasses import replace

from config import AGENT_MIN_ACCURACY
from engine.models import Check

# Checks that rely on TinyFish readings; downgraded when the agent is unreliable.
OUTSIDE_VIEW = {"fedwatch_gap", "news_reaction"}
_DOWNGRADE = {"ok": "warn", "warn": "bad", "bad": "bad"}


def apply_agent_accuracy(checks: list[Check], accuracy: float | None) -> list[Check]:
    if accuracy is None or accuracy >= AGENT_MIN_ACCURACY:
        return checks
    return [
        replace(c, status=_DOWNGRADE[c.status], detail=f"{c.detail} (agent accuracy {accuracy:.0%})")
        if c.name in OUTSIDE_VIEW else c
        for c in checks
    ]


def verdict(checks: list[Check]) -> str:
    statuses = {c.status for c in checks}
    if "bad" in statuses:
        return "unreliable"
    if "warn" in statuses:
        return "check"
    return "good"
