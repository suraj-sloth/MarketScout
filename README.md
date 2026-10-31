# MarketScout

> **Is this prediction market priced well — and does it agree with the world?**

MarketScout checks Polymarket prices for liquidity quality (spread, depth, YES/NO coherence, freshness) and cross-examines them against outside evidence scraped by **TinyFish** (CME FedWatch futures, real-time news reactions from CNBC & CoinDesk), assigning each market a clear verdict:

- 🟢 **Well-priced** — Tight spread, deep orderbook, coherent YES/NO books, aligned with the world.
- 🟡 **Check this** — Discrepancies found (e.g. FedWatch divergence, unreacted news, or wide spread).
- 🔴 **Unreliable** — Illiquid books, incoherent YES/NO pricing, or stale quotes.

---

## ⚡ Quick Start

### 1. Backend (FastAPI + uv)
```bash
cd backend
uv sync
AGENT_SCHEDULE=0 uv run uvicorn app:app --port 8000   # dev: no TinyFish credits spent
# demo: drop AGENT_SCHEDULE=0 so TinyFish refreshes every 15 min (see planning.md §9)
```
API runs on `http://localhost:8000`. Run test suite:
```bash
python -m unittest discover -s tests
```
*(51 passing unit tests)*

### 2. Frontend (Vite + React + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
Dashboard runs on `http://localhost:5173`.
Toggle between **Live API** and **Mock Mode** directly from the UI header!

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Frontend (Vite + React + TS)                            │
│  - Dark forest green fintech dashboard (LittleBee style)  │
│  - Interactive SVG price chart with news impact dots     │
│  - Depth & slippage calculator                           │
│  - Paper trading panel (simulated execution & P&L)       │
│  - Live / Mock mode runtime toggle                       │
│  - TinyFish autonomous agent console & step log          │
└────────────────────────────┬─────────────────────────────┘
                             │  /api/* (Proxied to :8000)
┌────────────────────────────▼─────────────────────────────┐
│  Backend (FastAPI)                                       │
│  - collector/polymarket.py  Polymarket CLOB & Gamma API   │
│  - agent/tinyfish.py        TinyFish autonomous scraper   │
│  - engine/quality.py        Spread, depth, coherence math│
│  - engine/evidence.py       FedWatch gap, news reaction   │
│  - engine/verdict.py        🟢🟡🔴 Composite scoring     │
│  - engine/paper.py          Orderbook fill & mark engine  │
│  - trader.py                TinyFish-triggered paper bot  │
└──────────────────────────────────────────────────────────┘
```

See [planning.md](planning.md) for full math specifications, thresholds, and task breakdown.
