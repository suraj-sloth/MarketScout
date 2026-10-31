"""MarketScout API. Routes return the shapes in contract/*.json."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import service
import store
from agent import tinyfish

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    poller = asyncio.create_task(store.poll_forever())
    store.schedule_agent_forever()
    yield
    poller.cancel()


app = FastAPI(title="MarketScout", lifespan=lifespan)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "events": {k: {"ready": v.snap is not None, "error": v.error} for k, v in store.STATE.items()}}


@app.get("/api/markets")
def markets() -> dict:
    return service.markets()


@app.get("/api/markets/{event_id}/evidence")
def evidence(event_id: str) -> dict:
    out = service.evidence(event_id)
    if out is None:
        raise HTTPException(404, f"no data for {event_id!r} yet")
    return out


KIND_LABELS = {"outside_view": "Outside view", "agent_check": "Accuracy check", "news": "News"}


@app.get("/api/sources")
def sources() -> dict:
    """Web sources TinyFish can run, straight from sources.yaml, with the time
    of the last cached result."""
    cache = tinyfish.read_cache()
    return {"sources": [
        {
            "id": s["id"],
            "name": s.get("name", s["id"]),
            "kind": s["kind"],
            "kind_label": KIND_LABELS.get(s["kind"], s["kind"]),
            "event": s.get("event"),
            "url": s["url"],
            "last_run": cache.get(s["id"], {}).get("ts"),
        }
        for s in tinyfish.load_sources().values()
    ]}


class AgentRunRequest(BaseModel):
    source_id: str


@app.post("/api/agent/run")
def agent_run(req: AgentRunRequest) -> dict:
    if req.source_id != "all" and req.source_id not in tinyfish.load_sources():
        raise HTTPException(404, f"unknown source {req.source_id!r}")
    return store.start_agent_run(req.source_id)


@app.get("/api/agent/runs/{run_id}")
def agent_run_status(run_id: str) -> dict:
    run = store.AGENT_RUNS.get(run_id)
    if run is None:
        raise HTTPException(404, "unknown run")
    return run
