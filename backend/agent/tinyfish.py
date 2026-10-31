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


PRIORITIES = ("high", "normal", "low")


def load_sources() -> dict[str, dict]:
    """sources.yaml entries, highest priority first (stable within a priority)."""
    sources = yaml.safe_load(SOURCES.read_text())
    sources.sort(key=lambda s: PRIORITIES.index(s.get("priority", "normal")))
    return {s["id"]: s for s in sources}


# --- schema validation ------------------------------------------------------
# sources.yaml schemas use a tiny notation: {field: str|int|float, list: [{...}]}

_TYPES = {"str": str, "int": int, "float": (int, float)}


def validate(value, schema, path: str = "result", allow_empty: bool = False) -> None:
    """Lists must be non-empty unless allow_empty: an empty FedWatch table or
    outcome list means the agent read nothing, and must not replace a good
    cached reading. News sources set allow_empty (no articles is a real answer)."""
    if isinstance(schema, dict):
        if not isinstance(value, dict):
            raise SchemaError(f"{path}: expected object")
        for key, sub in schema.items():
            if key not in value:
                raise SchemaError(f"{path}.{key}: missing")
            validate(value[key], sub, f"{path}.{key}", allow_empty)
    elif isinstance(schema, list):
        if not isinstance(value, list):
            raise SchemaError(f"{path}: expected list")
        if not value and not allow_empty:
            raise SchemaError(f"{path}: empty")
        for i, item in enumerate(value):
            validate(item, schema[0], f"{path}[{i}]", allow_empty)
    else:
        expected = _TYPES[schema]
        if isinstance(value, bool) or not isinstance(value, expected):
            raise SchemaError(f"{path}: expected {schema}, got {type(value).__name__}")


_JSON_TYPES = {"str": "string", "int": "integer", "float": "number"}


def to_json_schema(schema, allow_empty: bool = False) -> dict:
    """Convert the sources.yaml notation to the JSON Schema TinyFish's
    `output_schema` expects. Every listed field is required."""
    if isinstance(schema, dict):
        return {
            "type": "object",
            "properties": {k: to_json_schema(v, allow_empty) for k, v in schema.items()},
            "required": list(schema),
        }
    if isinstance(schema, list):
        out = {"type": "array", "items": to_json_schema(schema[0], allow_empty)}
        if not allow_empty:
            out["minItems"] = 1
        return out
    return {"type": _JSON_TYPES[schema]}


def request_body(source: dict) -> dict:
    """POST body for one source. Optional per-source settings in sources.yaml:
    max_duration_seconds (TinyFish stops the run itself after this) and
    strict_schema (also send the schema as TinyFish's `output_schema`).

    strict_schema is off by default: on the Polymarket page it made TinyFish
    return an empty list every time, while the same goal without it returned
    all five outcomes. The shape hint in the goal plus validate() is enough."""
    body = {
        "url": source["url"],
        "goal": f"{source['goal'].strip()}\nReturn JSON matching this shape: {json.dumps(source['schema'])}",
    }
    if source.get("strict_schema"):
        body["output_schema"] = to_json_schema(source["schema"], source.get("allow_empty", False))
    if "max_duration_seconds" in source:
        body["agent_config"] = {"max_duration_seconds": source["max_duration_seconds"]}
    return body


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


def _run(body: dict, timeout_s: float) -> dict:
    with httpx.Client(base_url=API, headers=_headers(), timeout=30) as c:
        r = c.post("/v1/automation/run-async", json=body)
        r.raise_for_status()
        run_id = r.json()["run_id"]
        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            body = c.get(f"/v1/runs/{run_id}").raise_for_status().json()
            if body["status"] in DONE:
                return body
            time.sleep(POLL_SECONDS)
    raise RuntimeError(f"run {run_id} timed out after {timeout_s:.0f}s")


def _run_with_retry(body: dict, attempts: int, timeout_s: float) -> dict:
    """Runs sometimes hang in RUNNING forever while a fresh run finishes in ~2 min,
    so give each attempt its own timeout and start over rather than wait longer."""
    for i in range(attempts):
        try:
            run = _run(body, timeout_s)
            if run.get("status") == "COMPLETED":
                return run
            err = RuntimeError(run.get("error") or f"status {run.get('status')}")
        except (httpx.HTTPError, RuntimeError) as e:
            err = e
        if i == attempts - 1:
            raise err
    raise AssertionError("unreachable")


def run_source(source_id: str, attempts: int = 2, timeout_s: float = 300) -> dict:
    """Run one source. On success the result is cached; on any failure the last
    good cached result is returned with from_cache=True (or the error if none)."""
    source = load_sources()[source_id]
    try:
        # Our client-side wait must outlast TinyFish's own limit for the run.
        timeout_s = max(timeout_s, source.get("max_duration_seconds", 0) + 60)
        body = _run_with_retry(request_body(source), attempts, timeout_s)
        validate(body["result"], source["schema"], allow_empty=source.get("allow_empty", False))
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
