import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Layers, 
  Clock, 
  Activity, 
  Newspaper,
  Compass
} from 'lucide-react';
import { Market, VerdictType, CheckStatus } from '../types';

interface MarketCardsGridProps {
  markets: Market[];
  selectedEventId: string;
  onSelectMarket: (market: Market) => void;
}

export const MarketCardsGrid: React.FC<MarketCardsGridProps> = ({
  markets,
  selectedEventId,
  onSelectMarket
}) => {
  const getVerdictBadge = (verdict: VerdictType) => {
    switch (verdict) {
      case 'good':
        return (
          <span className="badge-tag badge-good">
            <CheckCircle2 size={13} />
            <span>Well-priced</span>
          </span>
        );
      case 'check':
        return (
          <span className="badge-tag badge-warn">
            <AlertTriangle size={13} />
            <span>Check this</span>
          </span>
        );
      case 'unreliable':
        return (
          <span className="badge-tag badge-bad">
            <XCircle size={13} />
            <span>Unreliable</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'ok':
        return <span style={{ color: '#4ade80' }}>✓</span>;
      case 'warn':
        return <span style={{ color: '#facc15' }}>⚠</span>;
      case 'bad':
        return <span style={{ color: '#f87171' }}>✗</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Audited Prediction Markets
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Comparing Polymarket orderbook liquidity & coherence against TinyFish scraped ground truth
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Tracking {markets.length} liquid venues
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '16px'
      }}>
        {markets.map((m) => {
          const isSelected = m.event_id === selectedEventId;
          const pYes = m.p_yes !== null ? Math.round(m.p_yes * 100) : null;
          const pNo = pYes !== null ? 100 - pYes : null;

          return (
            <div
              key={m.event_id}
              onClick={() => onSelectMarket(m)}
              className="glass-panel"
              style={{
                padding: '20px',
                cursor: 'pointer',
                borderColor: isSelected ? '#22c55e' : 'rgba(34, 197, 94, 0.12)',
                background: isSelected 
                  ? 'linear-gradient(180deg, rgba(22, 38, 32, 0.95) 0%, rgba(12, 22, 18, 0.95) 100%)' 
                  : 'rgba(13, 23, 20, 0.75)',
                boxShadow: isSelected 
                  ? '0 0 25px rgba(34, 197, 94, 0.25), 0 8px 32px rgba(0, 0, 0, 0.5)' 
                  : 'var(--glass-shadow)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                position: 'relative'
              }}
            >
              {/* Top Bar: Title & Verdict */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                  <h4 style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    margin: 0,
                    lineHeight: 1.35,
                    flex: 1
                  }}>
                    {m.question}
                  </h4>
                  {getVerdictBadge(m.verdict)}
                </div>

                {/* Probability Bar */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: '#4ade80' }}>
                      YES {pYes !== null ? `${pYes}%` : '—'}
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                      NO {pNo !== null ? `${pNo}%` : '—'}
                    </span>
                  </div>

                  {/* Dual Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    overflow: 'hidden',
                    display: 'flex'
                  }}>
                    <div style={{
                      width: `${pYes || 50}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981 0%, #4ade80 100%)',
                      transition: 'width 0.4s ease'
                    }} />
                    <div style={{
                      width: `${pNo || 50}%`,
                      height: '100%',
                      background: 'rgba(255, 255, 255, 0.15)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Quick Quality Stats Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '8px',
                  marginTop: '14px',
                  background: 'rgba(8, 16, 14, 0.6)',
                  padding: '8px 10px',
                  borderRadius: '10px',
                  fontSize: '0.72rem'
                }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Spread</span>
                    <span style={{ fontWeight: 700, color: (m.spread_pts || 0) > 8 ? '#f87171' : '#f8fafc' }}>
                      {m.spread_pts !== null ? `${m.spread_pts.toFixed(1)} pts` : '—'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>5% Depth</span>
                    <span style={{ fontWeight: 700, color: m.depth_usd < 1000 ? '#f87171' : '#f8fafc' }}>
                      ${(m.depth_usd / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Coherence</span>
                    <span style={{ fontWeight: 700, color: '#4ade80' }}>
                      {m.incoherence_pts !== null && m.incoherence_pts > 3 ? `${m.incoherence_pts.toFixed(1)} pts` : 'In Sync'}
                    </span>
                  </div>
                </div>

                {/* Individual Checks Checklist */}
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {m.checks.slice(0, 3).map((chk, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                      <span style={{ fontSize: '0.8rem' }}>{getStatusIcon(chk.status)}</span>
                      <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>{chk.name.replace('_', ' ')}:</span>
                      <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{chk.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Card Footer: Sentiment & Action */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Newspaper size={13} color="#94a3b8" />
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {m.sentiment.n_articles > 0 
                      ? `${m.sentiment.label} (${m.sentiment.n_articles} articles)`
                      : 'No articles in 48h'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#64748b', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#4ade80'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                    title="View on Polymarket"
                  >
                    <ExternalLink size={14} />
                  </a>

                  <button
                    className="btn-secondary"
                    style={{
                      fontSize: '0.7rem',
                      padding: '4px 10px',
                      background: isSelected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#4ade80' : '#e2e8f0',
                      borderColor: isSelected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    {isSelected ? 'Auditing' : 'Inspect'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

