"""MarketScout API. Routes return the shapes in contract/*.json."""

from __future__ import annotations

from fastapi import FastAPI

app = FastAPI(title="MarketScout")


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
