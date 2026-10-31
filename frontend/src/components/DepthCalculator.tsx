import React, { useState } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Market, FedWatchData } from '../types';

interface DepthCalculatorProps {
  market: Market;
  fedwatch: FedWatchData | null;
}

// Everything here is derived from the live book (best ask, mid, depth within
// ±5 pts). We only have top-of-book prices, not every level, so share counts
// are "at best ask" and size is judged against visible depth — no slippage
// model and no trading "edge" (planning.md §10: judge price quality, not trades).

const fieldStyle: React.CSSProperties = {
  background: 'rgba(8, 16, 14, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  padding: '8px 12px',
  color: '#f8fafc',
  fontSize: '0.85rem',
  fontFamily: 'monospace'
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#94a3b8',
  display: 'block',
  marginBottom: '4px'
};

const boxStyle: React.CSSProperties = {
  background: 'rgba(10, 20, 16, 0.7)',
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid rgba(34, 197, 94, 0.15)'
};

const fmtPct = (p: number | null) => (p === null ? '—' : `${(p * 100).toFixed(1)}%`);
const fmtUsd = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`);

function sizeVerdict(share: number): { label: string; color: string } {
  if (share < 0.05) return { label: 'Small vs visible book', color: '#4ade80' };
  if (share < 0.25) return { label: 'Likely to move the price', color: '#facc15' };
  return { label: 'Larger than visible liquidity', color: '#f87171' };
}

export const DepthCalculator: React.FC<DepthCalculatorProps> = ({ market, fedwatch }) => {
  const [orderSizeUsd, setOrderSizeUsd] = useState<number>(2500);

  const ask = market.yes_ask;
  const mid = market.p_yes;
  const depth = market.depth_usd;

  const shares = ask ? orderSizeUsd / ask : null;
  const spreadCostUsd = shares !== null && ask !== null && mid !== null ? shares * (ask - mid) : null;
  const shareOfDepth = depth > 0 ? orderSizeUsd / depth : null;
  const size = shareOfDepth === null ? null : sizeVerdict(shareOfDepth);
  const gapPts = fedwatch && mid !== null ? (mid - fedwatch.p) * 100 : null;

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '16px',
      background: 'linear-gradient(180deg, rgba(16, 28, 24, 0.8) 0%, rgba(9, 17, 14, 0.9) 100%)'
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Order Size vs Liquidity
          </span>
          <Calculator size={16} color="#4ade80" />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          How much can this price absorb?
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Order size (USD)</label>
          <input
            type="number"
            value={orderSizeUsd}
            onChange={(e) => setOrderSizeUsd(Math.max(10, parseFloat(e.target.value) || 0))}
            style={{ ...fieldStyle, width: '100%', border: '1px solid rgba(255, 255, 255, 0.1)', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.9rem' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Best YES ask</label>
          <div style={fieldStyle}>{ask === null ? '—' : `$${ask.toFixed(3)}`}</div>
        </div>
        <div>
          <label style={labelStyle}>Mid (implied prob.)</label>
          <div style={fieldStyle}>{fmtPct(mid)}</div>
        </div>
        <div>
          <label style={labelStyle}>Depth within ±5 pts</label>
          <div style={fieldStyle}>{fmtUsd(depth)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={boxStyle}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
            Cost of crossing spread
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
            {spreadCostUsd === null ? '—' : fmtUsd(spreadCostUsd)}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
            {shares === null ? 'no ask in book' : `≈${Math.floor(shares).toLocaleString()} shares at best ask`}
          </div>
        </div>

        <div style={boxStyle}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
            Share of visible depth
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: size?.color ?? '#f8fafc', fontFamily: 'monospace' }}>
            {shareOfDepth === null ? '—' : `${(shareOfDepth * 100).toFixed(1)}%`}
          </div>
          <div style={{ fontSize: '0.65rem', color: size?.color ?? '#94a3b8', marginTop: '2px' }}>
            {size?.label ?? 'empty book'}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderRadius: '10px',
        background: 'rgba(148, 163, 184, 0.08)',
        border: '1px solid rgba(148, 163, 184, 0.2)'
      }}>
        <Info size={16} color="#94a3b8" />
        <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
          {gapPts === null
            ? 'Spread cost is versus mid. Depth counts resting orders within 5 pts of mid.'
            : `CME FedWatch ${fmtPct(fedwatch!.p)} vs Polymarket ${fmtPct(mid)} (${gapPts >= 0 ? '+' : ''}${gapPts.toFixed(1)} pts). A gap describes disagreement, not a trade.`}
        </span>
      </div>
    </div>
  );
};
