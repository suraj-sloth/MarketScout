# MarketScout — Hackathon Plan

> Is this prediction market priced well — and does it agree with the world?
>
> Date: 31 Oct 2026 · Duration: **4 hours** · Team: 2 (Person A = backend, Person B = frontend)
> Repo: https://github.com/suraj-sloth/MarketScout

---

## 0. TL;DR

MarketScout looks at **3 Polymarket prediction markets** (Fed decision is the headline) and gives each one a **verdict**:

- 🟢 **Well-priced** · 🟡 **Check this** · 🔴 **Unreliable**

The verdict comes from:

1. **Price quality** (Polymarket API) — spread, depth, YES/NO coherence, freshness.
2. **Outside view** (TinyFish scrapes CME FedWatch, which has no API) — do futures traders agree?
3. **News reaction** (TinyFish scrapes news sites) — did the price move when news broke?
4. **Light sentiment badge** — "News leans: hold (4 articles)" with links. Shown as context, **does not drive the verdict**.

**TinyFish is checked against the API:** it also reads the probability shown on the Polymarket web page, and we compare it with the API value. That gives an **agent accuracy** number — if TinyFish reads Polymarket correctly, we trust its FedWatch/news readings more.

**Not building:** perps, trading, login, WebSockets, other prediction venues, Rust.

---

## 1. Team and GitHub workflow

| | **Person A — backend** | **Person B — frontend** |
| --- | --- | --- |
| Owns | `backend/**`: Polymarket collector, math, TinyFish, API | `frontend/**`: React UI · `backend/sources.yaml` news entries · demo + pitch |
| Starts with | Repo setup + TinyFish go/no-go | UI against mock JSON in `contract/` |

**Folder ownership** (avoids merge conflicts): A owns `backend/`, B owns `frontend/`. `contract/` is shared — change it only by PR, tag the other person.

**Branches:** `main` always runs. One branch per task: `be/a3-polymarket-collector`, `fe/b4-market-card`. Small PRs; self-merge after a quick look is fine.

**Issues:** one GitHub issue per task in Section 8, titled with its ID, e.g. `[B4] MarketCard component`.

**The contract:** `contract/*.json` holds one example response per endpoint (Section 6). Frontend uses these files in mock mode; backend must return the same shape. That's how B never waits for A.

**Run locally**
- Backend: `cd backend && uv run uvicorn app:app --reload` → `localhost:8000`
- Frontend: `cd frontend && npm i && npm run dev` → `localhost:5173`
- `frontend/.env.local`: `VITE_API_MODE=mock` or `live`. Vite proxies `/api` to `localhost:8000`.
- TinyFish key in `backend/.env` (gitignored). `backend/.env.example` is committed.

---

## 2. Concepts (Person B — read this first)

### 2.1 Prediction market
A market on a yes/no question: *"Will the Fed cut rates in December?"*
- A **YES share** pays **$1** if it happens, **$0** if not. **NO** is the opposite.
- YES trading at **$0.64** → the market thinks it's **~64% likely**.
- Polymarket is the venue we use.

### 2.2 Order book, bid, ask
Each outcome (YES, NO) has an **order book**:
- **Bid** = highest price someone will **buy** at. **Ask** = lowest price someone will **sell** at.
- Buy now → pay the ask. Sell now → get the bid.
- **Size** = how many shares at that price. **Depth** = total $ sitting near the best prices.

```
YES book      price   size
  asks        0.67    2,000
              0.66    1,500   ← best ask
  ─────────────────────────
              0.62    1,000   ← best bid
  bids        0.61    3,000
```

### 2.3 Mid and spread
- **Mid** = (bid + ask) / 2 = (0.62 + 0.66) / 2 = **0.64** → 64%.
- **Spread** = ask − bid = 0.04 = **4 points**. Wide spread = the market isn't sure / few traders. Narrow = healthy.

### 2.4 Why a price can be "bad"
A displayed 64% means little if:
- the spread is huge (bid 0.50, ask 0.78 — "64%" is just the midpoint of nothing),
- there's only $200 in the book (one trader can push it anywhere),
- YES and NO don't agree (YES says 64%, NO says 1 − 0.30 = 70%),
- nobody has traded for hours (stale).

### 2.5 CME FedWatch
Big institutions trade **Fed Funds futures** on CME. CME's **FedWatch** page turns those prices into probabilities: "72% chance of a cut". It's a web page with **no free API**, so TinyFish reads it. If FedWatch says 72% and Polymarket says 64%, two groups of traders disagree — that's interesting.

### 2.6 News reaction
Prediction prices should **move when relevant news breaks**. If two outlets report "Fed officials favour holding rates" and the price doesn't move for an hour, the market may be slow or thin.

### 2.7 Sentiment (light)
For each article TinyFish says whether it makes YES **more likely (+1)**, **less likely (−1)** or **neutral (0)**, with a short quote as the reason. We average these into a small badge. It's **context**, not proof — that's why it doesn't change the verdict.

### 2.8 Agent accuracy
An AI reading a web page can misread it. So TinyFish also reads the Polymarket page itself, where we **already know the answer** from the API. Match rate = **agent accuracy**. We show it, and it scales how much we trust TinyFish's other readings.

---

## 3. Data sources

### API (ground truth) — Polymarket, public, no key
| Data | Endpoint (verify in hour 1) |
| --- | --- |
| Event + markets (question, end date, rules, token IDs) | `GET https://gamma-api.polymarket.com/events?slug=<slug>` |
| Order book per outcome token | `GET https://clob.polymarket.com/book?token_id=<token_id>` |
| Price history | `GET https://clob.polymarket.com/prices-history?market=<token_id>&interval=1d&fidelity=5` |

Each market has 2 token IDs (YES, NO) in `clobTokenIds`.

### Web (TinyFish) — sites with no API
All in `backend/sources.yaml`. Adding a source = adding a YAML entry, no code.

| ID | Source | Returns | Checked against |
| --- | --- | --- | --- |
| `fedwatch` | CME FedWatch page | Next meeting date, probability per rate range | Polymarket Fed market → **gap** |
| `news_*` | 2–3 news sites per event (B picks) | Headline, URL, time, direction (+1/0/−1), quoted reason | Polymarket price history → **reaction** + **sentiment** |
| `pm_page` | Polymarket event web page | Displayed probability per outcome | Polymarket API → **agent accuracy** |

Example entry:
```yaml
- id: news_reuters_fed
  kind: news
  event: fed-dec
  url: https://www.reuters.com/markets/us/
  goal: >
    List up to 5 articles from the last 48h about the Federal Reserve's next
    rate decision. For each: headline, URL, published time (UTC), whether it
    makes a rate CUT more likely (+1), less likely (-1) or neutral (0), and a
    one-sentence reason quoting the article.
  schema: {items: [{headline: str, url: str, published_at: str, direction: int, reason: str}]}
  refresh_minutes: 15
```

---

## 4. Architecture

```
┌──────────── Frontend (B) — Vite + React + TS ────────────┐
│  Market cards (verdict) · Evidence panel · Agent bar     │
│  polls /api/* every 5s                                   │
└──────────────────────────┬───────────────────────────────┘
                           │ JSON (shape = contract/*.json)
┌──────────── Backend (A) — FastAPI ───────────────────────┐
│  collector/polymarket.py   API: books + history          │
│  agent/tinyfish.py         runs sources.yaml, validates, │
│                            caches to agent_cache.json    │
│  engine/quality.py         spread, depth, coherence…     │
│  engine/evidence.py        FedWatch gap, news reaction,  │
│                            sentiment, agent accuracy     │
│  engine/verdict.py         combine → 🟢🟡🔴 + reasons     │
│  store.py                  latest data in memory         │
└──────────────────────────────────────────────────────────┘
```

**Who normalizes:** `collector/polymarket.py` turns API JSON into Pydantic models (`models.py`). `agent/tinyfish.py` validates TinyFish output against the `schema` in `sources.yaml`; bad output is dropped and logged. The engine only sees clean models.

**Repo layout**
```
MarketScout/
  planning.md  README.md  .gitignore
  contract/        markets.json  evidence.json  agent_run.json
  backend/         app.py config.py models.py store.py sources.yaml
                   collector/ agent/ engine/ tests/
  frontend/        src/{api.ts,types.ts,App.tsx,components/}
```

---

## 5. The math

All engine functions are pure (input → output) and unit-tested.

### 5.1 Probability from the books
$$
p_{yes} = \frac{bid_{YES} + ask_{YES}}{2}
\qquad
p_{yes}^{(NO)} = 1 - \frac{bid_{NO} + ask_{NO}}{2}
$$
Final $p$ = average of both if both books exist. Example: YES 0.62/0.66 → 0.64; NO 0.34/0.38 → 1 − 0.36 = 0.64. **p = 64%.**

### 5.2 Spread (in probability points)
$$
spread_{pts} = (ask_{YES} - bid_{YES}) \times 100
$$
0.66 − 0.62 → **4 pts**.

### 5.3 Depth
Dollar value of orders within 5 points of mid, both sides:
$$
depth_\$ = \sum_{\text{levels within } \pm0.05} price \times size
$$

### 5.4 YES/NO coherence
$$
incoherence_{pts} = |p_{yes} - p_{yes}^{(NO)}| \times 100
\qquad
overround = ask_{YES} + ask_{NO} - 1
$$
Incoherence > spread, or overround < 0 → something's off (stale or odd book).

### 5.5 Freshness
`age = now − last price change (from history)`. Stale if > 6 hours with no change.

### 5.6 FedWatch gap
FedWatch gives probabilities per target-rate range. Sum the ranges below the current rate = $p_{cut}^{FW}$.
$$
gap_{pts} = (p^{PM} - p^{FW}) \times 100
$$
Example: Polymarket 64%, FedWatch 72% → **−8 pts**. Only compare if the meeting date matches and both mean "cut of any size" (otherwise label *related, not equivalent*).

### 5.7 News reaction
For an article published at $t_0$ with direction $d \in \{-1, 0, +1\}$:
$$
\Delta p = p(t_0 + 60\text{min}) - p(t_0 - 5\text{min})
$$
- **Reacted:** $\text{sign}(\Delta p) = d$ and $|\Delta p| \ge 1$ pt
- **Unreacted:** $|\Delta p| < 1$ pt and ≥ 2 independent articles with the same $d$ within 2h
- **Counter-move:** price moved ≥ 1 pt the opposite way

Duplicates (same story on several sites) count once — dedupe by URL and similar headline.

### 5.8 Sentiment badge
Recency-weighted average of directions over 48h (half-life 24h):
$$
w_i = 0.5^{\,age_i/24h}
\qquad
sentiment = \frac{\sum w_i d_i}{\sum w_i} \in [-1, 1]
$$
Label: > 0.3 "leans YES", < −0.3 "leans NO", else "mixed". Always shown with article count.

### 5.9 Agent accuracy
For each `pm_page` reading:
$$
err = |p_{web} - p_{api}| \times 100
\qquad
match = err \le 2 \text{ pts}
$$
(2 pts tolerance because the price can move between reads.)
$$
accuracy = \frac{\#matches}{\#checks}
$$

### 5.10 Verdict
Each check gives ✅ / ⚠️ / ❌:

| Check | ✅ | ⚠️ | ❌ |
| --- | --- | --- | --- |
| Spread | ≤ 3 pts | 3–8 | > 8 |
| Depth | ≥ $10k | $1k–10k | < $1k |
| Coherence | incoherence ≤ spread | — | > spread or overround < 0 |
| Freshness | < 1h | 1–6h | > 6h |
| FedWatch gap (Fed only) | ≤ 3 pts | 3–8 | > 8 |
| News reaction | no unreacted news | 1 unreacted cluster | ≥ 2 |

Outside-view checks (FedWatch, news) are downgraded one level if `accuracy < 0.8`.

**Verdict:** any ❌ → 🔴 **Unreliable** · any ⚠️ → 🟡 **Check this** · all ✅ → 🟢 **Well-priced**.
Every verdict lists the reasons, e.g. *"🟡 Check this — FedWatch is 8 pts higher; 2 articles about officials favouring a hold haven't moved the price."*

Sentiment is shown next to the verdict but **is not an input**.

All thresholds live in `backend/config.py`.

---

## 6. API contract

Example files live in `contract/`. Both sides build to these.

### `GET /api/markets` → `contract/markets.json`
```json
{
  "as_of": "2026-10-31T14:00:00Z",
  "agent_accuracy": {"value": 0.92, "checks": 12},
  "markets": [
    {
      "event_id": "fed-dec",
      "question": "Will the Fed cut rates in December?",
      "url": "https://polymarket.com/event/...",
      "end_date": "2026-12-16",
      "p_yes": 0.64,
      "yes_bid": 0.62, "yes_ask": 0.66, "no_bid": 0.34, "no_ask": 0.38,
      "spread_pts": 4.0, "depth_usd": 18000, "incoherence_pts": 0.0,
      "last_change": "2026-10-31T13:10:00Z",
      "verdict": "check",
      "checks": [
        {"name": "spread", "status": "warn", "detail": "4 pts"},
        {"name": "depth", "status": "ok", "detail": "$18k"},
        {"name": "coherence", "status": "ok", "detail": "YES and NO agree"},
        {"name": "freshness", "status": "ok", "detail": "changed 50 min ago"},
        {"name": "fedwatch_gap", "status": "warn", "detail": "FedWatch 72% vs 64% (−8 pts)"},
        {"name": "news_reaction", "status": "warn", "detail": "2 articles, price flat 60 min"}
      ],
      "sentiment": {"value": -0.6, "label": "leans NO", "n_articles": 4}
    }
  ]
}
```

### `GET /api/markets/{event_id}/evidence` → `contract/evidence.json`
```json
{
  "event_id": "fed-dec",
  "price_history": [{"t": "2026-10-31T12:00:00Z", "p": 0.66}, {"t": "2026-10-31T15:00:00Z", "p": 0.64}],
  "fedwatch": {"p": 0.72, "meeting_date": "2026-12-16", "url": "https://www.cmegroup.com/...", "ts": "2026-10-31T13:45:00Z", "from_cache": false},
  "articles": [
    {"source": "Reuters", "headline": "Fed officials signal patience...", "url": "https://...",
     "published_at": "2026-10-31T14:02:00Z", "direction": -1,
     "reason": "Two officials said they 'favour holding rates'.", "reaction": "unreacted", "delta_p_pts": 0.0}
  ]
}
```

### `POST /api/agent/run` → `contract/agent_run.json`
Request `{"source_id": "fedwatch"}` (or `"all"`).
```json
{
  "run_id": "r1", "status": "done", "source_id": "fedwatch",
  "steps": ["Opened cmegroup.com FedWatch", "Selected December meeting", "Read probability table"],
  "result": {"meeting_date": "2026-12-16", "probabilities": [{"range_bps": "350-375", "prob": 0.72}]},
  "schema_valid": true, "from_cache": false
}
```
If slow: return `"status": "running"`, UI polls `GET /api/agent/runs/{run_id}`.

---

## 7. UI (Person B)

One page, dark theme.

```
┌─ MarketScout ─────────────── as of 14:00 ● live · agent accuracy 92% ─┐
│ Agent: [ FedWatch ▾ ] [Run]   ✓ opened cmegroup ✓ read table          │
├───────────────────────────────────────────────────────────────────────┤
│ ┌ Fed cuts in December? ────────────────── 🟡 Check this ─────────┐   │
│ │ 64%  ██████░░░░   spread 4 · depth $18k · updated 50m ago  ↗   │   │
│ │ ⚠ FedWatch 72% vs 64% (−8)   ⚠ 2 articles, price flat 60m      │   │
│ │ 📰 News leans NO (4 articles)                       [evidence] │   │
│ └────────────────────────────────────────────────────────────────┘   │
│ ┌ Market 2 ... 🟢 ┐  ┌ Market 3 ... 🔴 ┐                               │
├───────────────────────────────────────────────────────────────────────┤
│ EVIDENCE — Fed cuts in December?                                      │
│  price ▁▂▂▃▃▃▃▃  (dots = articles)      FedWatch 72%  ↗                │
│  14:02 Reuters ↓ "officials favour holding"   unreacted  ↗            │
│  14:20 CNBC    ↓ "...patience..."             unreacted  ↗            │
└───────────────────────────────────────────────────────────────────────┘
Footer: Not financial advice. Verdicts describe price quality, not what will happen.
```

Rules: every number has a source + time; cached TinyFish results say "cached HH:MM"; mock mode shows a "MOCK DATA" banner.

Stack: Vite + React + TypeScript, plain CSS, `fetch` + `setInterval`. Price line: SVG polyline (no chart library needed).

---

## 8. Tasks

~20–40 min each. Each task = one GitHub issue + one PR. Times are start times.

### Person A — backend

| ID | Start | Task | Done when |
| --- | --- | --- | --- |
| A1 | 0:00 | Repo skeleton: `backend/` FastAPI with `/api/health`, `.env.example`, `contract/*.json` committed | `curl /api/health` ok; B can pull contract |
| A2 | 0:15 | TinyFish key + run FedWatch by hand — **go/no-go** | JSON back, or decide news-only fallback |
| A3 | 0:30 | `collector/polymarket.py`: event by slug → token IDs → YES/NO books + price history; Pydantic models | Prints books + history for Fed event |
| A4 | 1:00 | `engine/quality.py`: p_yes, spread, depth, coherence, freshness (5.1–5.5) + tests | Tests pass |
| A5 | 1:30 | `agent/tinyfish.py`: `run_source(id)` from `sources.yaml`, schema validation, `agent_cache.json` | `run_source("fedwatch")` returns valid JSON |
| A6 | 1:50 | `engine/evidence.py`: FedWatch gap, news reaction, dedupe, sentiment, accuracy (5.6–5.9) + tests | Tests pass |
| A7 | 2:20 | `engine/verdict.py` (5.10) + routes `/api/markets`, `/evidence`, `/agent/run` | Responses match `contract/` keys |
| A8 | 2:45 | Background loop: Polymarket every 5s, TinyFish every 15 min; cache fallback | Live data flows with TinyFish off |
| A9 | 3:15 | Wire up with B, fix bugs, sanity-check numbers vs polymarket.com | Live UI matches website |

### Person B — frontend + sources + demo

| ID | Start | Task | Done when |
| --- | --- | --- | --- |
| B1 | 0:00 | Read Section 2. Vite + React + TS scaffold, dark layout | Page renders |
| B2 | 0:20 | Pick 3 Polymarket events (Fed + 2 liquid ones) + 2–3 news sites each; check they load without login/paywall | List posted in an issue; A puts slugs in `config.py` |
| B3 | 0:40 | `types.ts` from contract; `api.ts` with mock/live switch | Mock data loads |
| B4 | 1:00 | `MarketCard`: question, probability bar, stats, verdict badge, check list, sentiment badge | Renders 3 mock cards |
| B5 | 1:40 | Add `news_*` entries to `sources.yaml` (PR into backend, A reviews); test one in TinyFish playground | One returns valid JSON |
| B6 | 2:00 | `EvidencePanel`: SVG price line with article dots, FedWatch value, article list with reason + link | Renders mock |
| B7 | 2:30 | `AgentBar`: source dropdown, Run, step log, accuracy badge | Shows mock run |
| B8 | 2:50 | Switch to live; loading/error states; "cached" + "MOCK" labels; footer | Works on live backend |
| B9 | 3:15 | Demo script + 3-slide pitch; rehearse with A | Run-through done twice |

### If behind
Cut in order: news reaction (keep articles + sentiment) → 3rd market → live agent step log (show cached). **Never cut:** price-quality checks, verdict, FedWatch or news via TinyFish, agent accuracy.

---

## 9. Demo (~4 min)

1. **Problem (30s):** "Prediction markets show a number like 64%. Is it a good number? Depends on liquidity, spread and whether it agrees with the world."
2. **Cards (60s):** Three markets, three verdicts. Open a 🔴 one: "wide spread, $600 depth — that 40% means nothing."
3. **Agent (60s):** Run FedWatch live. TinyFish browses CME. "Futures traders say 72%, Polymarket 64%." Point at agent accuracy: "we trust this read because it matched the Polymarket API 11/12 times."
4. **Evidence (60s):** Price line with article dots. "Two outlets said officials favour holding, the price didn't move. News leans NO." Click a link.
5. **Close (30s):** "MarketScout: a quality check for prediction-market prices. Next: Kalshi, cross-venue matching, more evidence sources."

---

## 10. Rules

- Every number has a source and a timestamp.
- Mock and cached data are labelled.
- We judge **price quality**, never "this will happen" or "buy this".
- Sentiment is context, not a verdict input.

## 11. Later

Kalshi + cross-venue event matching · perps module (Binance/Bybit, VWAP) · Rust ingestion · more evidence sources · history + charts.

## 12. Open questions

- [ ] TinyFish via API or MCP? Rate limits / time per run?
- [ ] Final 3 events (B2)
- [ ] FedWatch reachable by TinyFish? (A2)
