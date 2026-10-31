# MarketScout Frontend

A high-performance, dark-themed prediction market intelligence and price-quality auditing dashboard built with **Vite**, **React**, **TypeScript**, and **Lucide Icons**.

Inspired by modern fintech & terminal dashboards, MarketScout visualizes orderbook depth, spread tightness, YES/NO coherence, outside-view consensus (CME FedWatch), breaking news reactions, and TinyFish autonomous agent accuracy benchmarks.

---

## 🚀 Features

- **Consensus Probability & History Chart (`MarketHeroChart.tsx`)**:
  - Interactive SVG curve with neon glowing accents and area gradient fill.
  - Interactive hover crosshairs & tooltips with real-time probability readings.
  - **Breaking News Dots Overlay**: Plots Reuters, Bloomberg, and CNBC articles directly onto the timeline with sentiment direction tags (`+1 Cut`, `-1 Hold`, `0 Neutral`) and price reaction classification (`reacted`, `unreacted`, `counter`).
- **Position Size & Market Depth Inspector (`DepthCalculator.tsx`)**:
  - Simulates order execution against Polymarket's 5% depth band to calculate expected slippage and arbitrage edge vs outside futures benchmarks.
- **Audited Market Cards Grid (`MarketCardsGrid.tsx`)**:
  - Multi-market overview (Fed Decision, Bitcoin $150k, US Government Shutdown).
  - Clear verdicts: 🟢 **Well-priced**, 🟡 **Check this**, 🔴 **Unreliable**.
  - Dual probability bar, spread (pts), 5% band depth ($USD), coherence test, and recency-weighted sentiment badges.
- **Economic Events & FOMC Calendar (`EconomicEventsPanel.tsx`)**:
  - Tracks key macroeconomic catalysts (Core PCE, CPI, Nonfarm Payrolls, Powell speeches) with country flags and impact ratings.
- **News Reaction Stream (`NewsReactionFeed.tsx`)**:
  - Deduplicated financial news feed with delta price impact ($\Delta p$ within 60 min) and verbatim quoted reasons.
- **Market Hours & Sessions (`MarketHoursWidget.tsx`)**:
  - Visual global session clocks for New York (CME / NYSE), London, and Tokyo.
- **TinyFish Autonomous Agent Console (`AgentModal.tsx`)**:
  - Trigger live or simulated agent runs for `fedwatch`, `pm_page_fed`, `news_reuters_fed`, or `all`.
  - Animated step-by-step terminal execution log.
  - Schema-validated output inspection with formatted JSON.
- **Dual Mode Support**:
  - Seamless toggle between **`LIVE API`** (`/api/...` proxy to port 8000) and **`MOCK MODE`** (using contract fixtures from `contract/*.json`).

---

## 🛠️ Setup & Running

### Prerequisites
- Node.js >= 18 (Tested on v24)
- npm >= 9

### Development Server
```bash
cd frontend
npm install
npm run dev
```
The application will launch on `http://localhost:5173`.
By default, requests to `/api` are proxied to `http://localhost:8000`.

### Production Build
```bash
npm run build
```
Type checks with `tsc -b` and bundles into `dist/`.

---

## 📁 Directory Structure

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
├── public/
│   └── scout-icon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types.ts              # TypeScript interfaces matching contract/*.json
    ├── mockData.ts           # Fixture data for mock mode & demo resilience
    ├── api.ts                # API client with live/mock runtime toggle
    ├── styles/
    │   └── theme.css         # Custom dark-emerald theme, glassmorphism & animations
    └── components/
        ├── Header.tsx        # Brand logo, accuracy badge, live toggle, run button
        ├── Sidebar.tsx       # Pill navigation, TinyFish agent card, social links
        ├── MarketHeroChart.tsx # SVG price history curve with article dots
        ├── DepthCalculator.tsx # Slippage and outside-edge calculator
        ├── MarketCardsGrid.tsx # Tracked markets grid with verdict badges
        ├── EconomicEventsPanel.tsx # FOMC and macroeconomic calendar
        ├── NewsReactionFeed.tsx# Live news reaction impact list
        ├── MarketHoursWidget.tsx # Global financial session clocks
        └── AgentModal.tsx    # Live TinyFish execution console & step log
```
