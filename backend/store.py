"""Latest data in memory, plus the background loops that refresh it (task A8)."""

from __future__ import annotations

import asyncio
import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass, field

from agent import tinyfish
from collector import polymarket as pm
from config import AGENT_REFRESH_MINUTES, EVENTS, POLL_SECONDS

log = logging.getLogger("marketscout")


@dataclass
class EventState:
    meta: pm.MarketMeta | None = None
    snap: pm.MarketSnapshot | None = None
    outcome_mids: dict[int, float] = field(default_factory=dict)  # Fed: all 5 markets
    error: str | None = None


STATE: dict[str, EventState] = {e["event_id"]: EventState() for e in EVENTS}
AGENT_RUNS: dict[str, dict] = {}


# --- Polymarket polling -----------------------------------------------------

async def _refresh(client, event: dict) -> None:
    st = STATE[event["event_id"]]
    try:
        if st.meta is None:
            st.meta = await pm.fetch_event_market(client, event["slug"], event["market_index"])
        st.snap = await pm.snapshot(client, st.meta)
        if event.get("fed"):
            st.outcome_mids = await pm.fetch_event_mids(client, event["slug"])
        st.error = None
    except Exception as e:  # keep serving the last good snapshot
        st.error = str(e)
        log.warning("refresh %s failed: %s", event["event_id"], e)


async def poll_forever() -> None:
    async with pm.client() as client:
        while True:
            await asyncio.gather(*(_refresh(client, e) for e in EVENTS))
            await asyncio.sleep(POLL_SECONDS)


# --- TinyFish ---------------------------------------------------------------

def start_agent_run(source_id: str) -> dict:
    """Run sources in a background thread; poll AGENT_RUNS[run_id] for the result."""
    sources = list(tinyfish.load_sources()) if source_id == "all" else [source_id]
    run_id = uuid.uuid4().hex[:8]
    AGENT_RUNS[run_id] = {"run_id": run_id, "source_id": source_id, "status": "running",
                          "steps": [f"Started TinyFish on {s}" for s in sources]}

    def work() -> None:
        results = [tinyfish.run_source(s) for s in sources]
        run = AGENT_RUNS[run_id]
        for r in results:
            if r["status"] == "failed":
                run["steps"].append(f"{r['source_id']}: failed ({r['error']})")
            elif r["from_cache"]:
                run["steps"].append(f"{r['source_id']}: live run failed, using cached result from {r['ts'][11:16]} UTC")
            else:
                run["steps"].append(f"{r['source_id']}: done in {r.get('num_steps')} browser steps")
        last = results[-1]
        run.update(status="done", result=last.get("result"),
                   schema_valid=last.get("schema_valid", False), from_cache=last.get("from_cache", False))

    threading.Thread(target=work, daemon=True).start()
    return AGENT_RUNS[run_id]


def schedule_agent_forever() -> None:
    """Refresh every source on a timer. Set AGENT_SCHEDULE=0 to save TinyFish
    credits during development (the UI then serves agent_cache.json)."""
    if os.environ.get("AGENT_SCHEDULE", "1") == "0":
        log.info("agent schedule disabled")
        return

    def loop() -> None:
        while True:
            for source_id in tinyfish.load_sources():
                tinyfish.run_source(source_id)
            time.sleep(AGENT_REFRESH_MINUTES * 60)

    threading.Thread(target=loop, daemon=True).start()
