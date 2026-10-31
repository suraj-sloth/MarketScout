# Backend (Person A)

```sh
uv sync
uv run uvicorn app:app --reload          # http://localhost:8000/api/health
uv run python -m collector.polymarket fed-decision-in-december   # live check of Polymarket APIs
uv run pytest                             # engine tests (also: python3 -m unittest)
```

Copy `.env.example` to `.env` and add the TinyFish key.

- `engine/` is pure math on stdlib dataclasses (`engine/models.py`) — no network, easy to test.
- `collector/` turns API responses into engine models.
- `agent/` runs `sources.yaml` entries through TinyFish.
