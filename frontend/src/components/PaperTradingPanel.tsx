import React, { useEffect, useState } from 'react';
import { Bot, FlaskConical } from 'lucide-react';
import { fetchPaper } from '../api';
import { PaperResponse } from '../types';

// Automated paper trading: TinyFish runs trigger the rules on the backend;
// fills are simulated against the live order book. No real orders.

const panelBg = 'linear-gradient(180deg, rgba(16, 28, 24, 0.8) 0%, rgba(9, 17, 14, 0.9) 100%)';
const cell: React.CSSProperties = { padding: '6px 8px', fontSize: '0.75rem', color: '#e2e8f0', textAlign: 'left' };
const head: React.CSSProperties = { ...cell, color: '#64748b', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' };

const usd = (v: number | null) => (v === null ? '—' : `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`);
const pnlColor = (v: number | null) => (v === null || v === 0 ? '#94a3b8' : v > 0 ? '#4ade80' : '#f87171');
const hhmm = (ts: string) => new Date(ts).toISOString().slice(11, 16);

export const PaperTradingPanel: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [data, setData] = useState<PaperResponse | null>(null);

  useEffect(() => {
    fetchPaper().then(setData);
  }, [refreshKey]);

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: panelBg }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Automated Paper Trading</h4>
          <span className="badge-tag badge-warn" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
            <FlaskConical size={11} style={{ marginRight: 4 }} />
            SIMULATED — NO REAL ORDERS
          </span>
        </div>
        {data && (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {data.totals.open_positions} open · cost {usd(data.totals.cost_usd)} · P&L{' '}
            <span style={{ color: pnlColor(data.totals.pnl_usd), fontWeight: 700 }}>{usd(data.totals.pnl_usd)}</span>
          </div>
        )}
      </div>

      {!data ? (
        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>Paper trading state unavailable.</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.72rem', color: '#94a3b8' }}>
            <div><Bot size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Triggered when a TinyFish source finishes a fresh run.</div>
            {Object.values(data.rules).map((r) => <div key={r}>• {r}</div>)}
          </div>

          {data.positions.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>No positions yet — no rule has fired.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Opened', 'Market', 'Side', 'Shares', 'Avg', 'Cost', 'Value (bid)', 'P&L', 'Why'].map((h) => <th key={h} style={head}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.positions.map((p) => (
                  <tr key={p.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={cell}>{hhmm(p.opened_at)}</td>
                    <td style={{ ...cell, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.question}>{p.question}</td>
                    <td style={{ ...cell, fontWeight: 700 }}>{p.side}</td>
                    <td style={cell}>{Math.round(p.shares).toLocaleString()}</td>
                    <td style={cell}>{p.avg_price.toFixed(3)}{p.complete_fill ? '' : ' (partial)'}</td>
                    <td style={cell}>{usd(p.cost_usd)}</td>
                    <td style={cell}>{usd(p.mark_value_usd)}</td>
                    <td style={{ ...cell, color: pnlColor(p.pnl_usd), fontWeight: 700 }}>{usd(p.pnl_usd)}</td>
                    <td style={{ ...cell, color: '#94a3b8' }}>{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
              Decision log
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: 180, overflowY: 'auto' }}>
              {data.decisions.length === 0 && <div style={{ color: '#64748b', fontSize: '0.75rem' }}>No TinyFish runs evaluated yet.</div>}
              {data.decisions.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.72rem', color: '#cbd5e1' }}>
                  <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{hhmm(d.ts)}</span>
                  <span className={`badge-tag ${d.action === 'buy' ? 'badge-good' : ''}`} style={{ fontSize: '0.6rem', padding: '1px 6px', minWidth: 34, justifyContent: 'center' }}>
                    {d.action.toUpperCase()}
                  </span>
                  <span style={{ color: '#94a3b8' }}>{d.event_id}</span>
                  <span>{d.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
