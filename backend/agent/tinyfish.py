"""Run sources.yaml entries through the TinyFish agent API (planning.md §3).

POST /v1/automation/run-async {url, goal}  header X-API-Key  -> {run_id}
GET  /v1/runs/{run_id} -> {status: PENDING|RUNNING|COMPLETED|FAILED|CANCELLED,
                           num_of_steps, result, error}
A FedWatch run takes ~2 min and the sync /run endpoint drops the connection
on long runs, so we start async and poll. Call this off the request path.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
import yaml
from dotenv import load_dotenv

BACKEND = Path(__file__).resolve().parent.parent
SOURCES = BACKEND / "sources.yaml"
CACHE = BACKEND / "agent_cache.json"
API = "https://agent.tinyfish.ai"
POLL_SECONDS = 5
DONE = {"COMPLETED", "FAILED", "CANCELLED"}

load_dotenv(BACKEND / ".env")


class SchemaError(ValueError):
    pass


def load_sources() -> dict[str, dict]:
    return {s["id"]: s for s in yaml.safe_load(SOURCES.read_text())}


# --- schema validation ------------------------------------------------------
# sources.yaml schemas use a tiny notation: {field: str|int|float, list: [{...}]}

_TYPES = {"str": str, "int": int, "float": (int, float)}


def validate(value, schema, path: str = "result") -> None:
    if isinstance(schema, dict):
        if not isinstance(value, dict):
            raise SchemaError(f"{path}: expected object")
        for key, sub in schema.items():
            if key not in value:
                raise SchemaError(f"{path}.{key}: missing")
            validate(value[key], sub, f"{path}.{key}")
    elif isinstance(schema, list):
        if not isinstance(value, list):
            raise SchemaError(f"{path}: expected list")
        for i, item in enumerate(value):
            validate(item, schema[0], f"{path}[{i}]")
    else:
        expected = _TYPES[schema]
        if isinstance(value, bool) or not isinstance(value, expected):
            raise SchemaError(f"{path}: expected {schema}, got {type(value).__name__}")


def goal_with_schema(source: dict) -> str:
    return f"{source['goal'].strip()}\nReturn only JSON matching this shape: {json.dumps(source['schema'])}"


# --- cache ------------------------------------------------------------------

def read_cache() -> dict:
    try:
        return json.loads(CACHE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _write_cache(source_id: str, entry: dict) -> None:
    cache = read_cache()
    cache[source_id] = entry
    CACHE.write_text(json.dumps(cache, indent=1))


# --- run --------------------------------------------------------------------

def _headers() -> dict:
    return {"X-API-Key": os.environ["TINYFISH_API_KEY"]}


def _run(url: str, goal: str, timeout_s: float) -> dict:
    with httpx.Client(base_url=API, headers=_headers(), timeout=30) as c:
        r = c.post("/v1/automation/run-async", json={"url": url, "goal": goal})
        r.raise_for_status()
        run_id = r.json()["run_id"]
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            body = c.get(f"/v1/runs/{run_id}").raise_for_status().json()
            if body["status"] in DONE:
                return body
            time.sleep(POLL_SECONDS)
    raise RuntimeError(f"run {run_id} timed out after {timeout_s:.0f}s")


def run_source(source_id: str, timeout_s: float = 600) -> dict:
    """Run one source. On success the result is cached; on any failure the last
    good cached result is returned with from_cache=True (or the error if none)."""
    source = load_sources()[source_id]
    try:
        body = _run(source["url"], goal_with_schema(source), timeout_s)
        if body.get("status") != "COMPLETED":
            raise RuntimeError(body.get("error") or f"status {body.get('status')}")
        validate(body["result"], source["schema"])
        entry = {
            "source_id": source_id,
            "run_id": body.get("run_id"),
            "status": "done",
            "num_steps": body.get("num_of_steps"),
            "result": body["result"],
            "schema_valid": True,
            "ts": datetime.now(timezone.utc).isoformat(),
            "from_cache": False,
        }
        _write_cache(source_id, entry)
        return entry
    except (httpx.HTTPError, RuntimeError, SchemaError, KeyError) as e:
        cached = read_cache().get(source_id)
        if cached:
            return {**cached, "from_cache": True, "error": str(e)}
        return {"source_id": source_id, "status": "failed", "error": str(e), "from_cache": False}


if __name__ == "__main__":
    print(json.dumps(run_source(sys.argv[1]), indent=1))
