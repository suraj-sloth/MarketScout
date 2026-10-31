import React, { useState, useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Compass, Newspaper, Info } from 'lucide-react';
import { Market, PricePoint, Article, FedWatchData } from '../types';

interface MarketHeroChartProps {
  market: Market;
  priceHistory: PricePoint[];
  articles: Article[];
  fedwatch: FedWatchData | null;
}

export const MarketHeroChart: React.FC<MarketHeroChartProps> = ({
  market,
  priceHistory,
  articles,
  fedwatch
}) => {
  const [activeInterval, setActiveInterval] = useState<'1D' | '7D' | '1M' | 'ALL'>('1D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverArticle, setHoverArticle] = useState<Article | null>(null);

  // Fallback points if empty
  const points = useMemo(() => {
    if (priceHistory && priceHistory.length > 0) return priceHistory;
    // Mock smooth curve
    return Array.from({ length: 24 }).map((_, i) => ({
      t: new Date(Date.now() - (23 - i) * 3600 * 1000).toISOString(),
      p: 0.62 + Math.sin(i / 3) * 0.04
    }));
  }, [priceHistory]);

  // Chart coordinates calculation
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 30, left: 40 };

  const minP = useMemo(() => {
    const val = Math.min(...points.map((p) => p.p));
    return Math.max(0, val - 0.05);
  }, [points]);

  const maxP = useMemo(() => {
    const val = Math.max(...points.map((p) => p.p));
    return Math.min(1, val + 0.05);
  }, [points]);

  const getY = (p: number) => {
    const scale = (height - padding.top - padding.bottom) / (maxP - minP || 0.1);
    return height - padding.bottom - (p - minP) * scale;
  };

  const getX = (index: number) => {
    const scale = (width - padding.left - padding.right) / Math.max(1, points.length - 1);
    return padding.left + index * scale;
  };

  // Generate SVG path strings
  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, curr, idx) => {
      const x = getX(idx);
      const y = getY(curr.p);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [points, minP, maxP]);

  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = getX(0);
    const lastX = getX(points.length - 1);
    const bottomY = height - padding.bottom;
    return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [pathD, points]);

  const currentMid = market.p_yes !== null ? (market.p_yes * 100).toFixed(1) : '64.0';
  const displayedPoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];
  const displayedProb = displayedPoint ? (displayedPoint.p * 100).toFixed(1) : currentMid;

  // Map articles to approximate x coordinates along the timeline
  const articleMarkers = useMemo(() => {
    if (!articles || articles.length === 0 || points.length === 0) return [];
    const startTime = new Date(points[0].t).getTime();
    const endTime = new Date(points[points.length - 1].t).getTime();
    const timeSpan = endTime - startTime || 1;

    return articles.map((art) => {
      const artTime = new Date(art.published_at).getTime();
      const clamped = Math.max(startTime, Math.min(endTime, artTime));
      const ratio = (clamped - startTime) / timeSpan;
      const x = padding.left + ratio * (width - padding.left - padding.right);
      
      // Interpolate y price
      const idx = Math.min(points.length - 1, Math.max(0, Math.floor(ratio * (points.length - 1))));
      const y = getY(points[idx].p);

      return {
        article: art,
        x,
        y
      };
    });
  }, [articles, points, minP, maxP]);

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      background: 'linear-gradient(180deg, rgba(16, 28, 24, 0.8) 0%, rgba(9, 17, 14, 0.9) 100%)'
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '25%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(34, 197, 94, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      {/* Header Row: Title, Probability, and Time Intervals */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Primary Audited Market
            </span>
            <span className="badge-tag badge-good" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
              POLYSCOUT VERIFIED
            </span>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0, maxWidth: '580px', lineHeight: 1.3 }}>
            {market.question}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4ade80', letterSpacing: '-0.03em' }}>
                {displayedProb}%
              </span>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                YES Mid
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700
            }}>
              <ArrowUpRight size={14} />
              <span>+2.4% 24h</span>
            </div>

            {fedwatch && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                color: '#facc15',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <Compass size={14} />
                <span>CME FedWatch: {(fedwatch.p * 100).toFixed(0)}%</span>
                <span style={{ opacity: 0.8 }}>
                  (Gap: {((market.p_yes || 0.64) * 100 - fedwatch.p * 100).toFixed(1)} pts)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Interval Filters (Matching LittleBee's 6 Month dropdown) */}
        <div style={{
          display: 'flex',
          background: 'rgba(8, 16, 13, 0.8)',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {(['1D', '7D', '1M', 'ALL'] as const).map((int) => (
            <button
              key={int}
              onClick={() => setActiveInterval(int)}
              style={{
                background: activeInterval === int ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                color: activeInterval === int ? '#4ade80' : '#64748b',
                border: activeInterval === int ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {int}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive SVG Chart Canvas */}
      <div style={{ position: 'relative', width: '100%', height: `${height}px`, zIndex: 2 }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseLeave={() => {
            setHoverIndex(null);
            setHoverArticle(null);
          }}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="50%" stopColor="#a3e635" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((level) => {
            if (level < minP || level > maxP) return null;
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  fill="#475569"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {(level * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Smooth Polyline */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#lineGlow)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glowFilter)"
          />

          {/* Hover Crosshair */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={height - padding.bottom}
                stroke="rgba(74, 222, 128, 0.4)"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(points[hoverIndex].p)}
                r="6"
                fill="#a3e635"
                stroke="#062e1a"
                strokeWidth="3"
                filter="url(#glowFilter)"
              />
            </g>
          )}

          {/* Article Milestone Overlay Dots */}
          {articleMarkers.map((marker, i) => {
            const isHovered = hoverArticle === marker.article;
            const dotColor = marker.article.direction === 1 
              ? '#4ade80' 
              : marker.article.direction === -1 
              ? '#f87171' 
              : '#94a3b8';

            return (
              <g
                key={i}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverArticle(marker.article)}
                onMouseLeave={() => setHoverArticle(null)}
              >
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={isHovered ? 8 : 5}
                  fill={dotColor}
                  stroke="#07150f"
                  strokeWidth="2"
                  className="pulsing-dot"
                />
                {isHovered && (
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    r="12"
                    fill="none"
                    stroke={dotColor}
                    strokeWidth="1.5"
                    opacity="0.6"
                  />
                )}
              </g>
            );
          })}

          {/* Transparent Hover Hitboxes */}
          {points.map((_, idx) => {
            const step = (width - padding.left - padding.right) / points.length;
            const x = getX(idx) - step / 2;
            return (
              <rect
                key={idx}
                x={x}
                y={padding.top}
                width={step}
                height={height - padding.top - padding.bottom}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay for Chart Point */}
        {hoverIndex !== null && !hoverArticle && displayedPoint && (
          <div style={{
            position: 'absolute',
            left: `${(getX(hoverIndex) / width) * 100}%`,
            top: `${(getY(displayedPoint.p) / height) * 100}%`,
            transform: 'translate(-50%, -125%)',
            background: 'rgba(10, 20, 16, 0.95)',
            border: '1px solid rgba(74, 222, 128, 0.4)',
            borderRadius: '10px',
            padding: '8px 12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>
              {(displayedPoint.p * 100).toFixed(1)}% Mid
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {new Date(displayedPoint.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
            </div>
          </div>
        )}

        {/* Hover Tooltip Overlay for Breaking News Article */}
        {hoverArticle && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '20px',
            maxWidth: '320px',
            background: 'rgba(12, 22, 18, 0.96)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            borderRadius: '12px',
            padding: '12px 14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            zIndex: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4ade80' }}>
                {hoverArticle.source}
              </span>
              <span className={`badge-tag ${
                hoverArticle.reaction === 'reacted' ? 'badge-good' : 'badge-warn'
              }`} style={{ fontSize: '0.65rem' }}>
                {hoverArticle.reaction.toUpperCase()}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', margin: '0 0 6px 0', lineHeight: 1.3 }}>
              {hoverArticle.headline}
            </p>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
              "{hoverArticle.reason}"
            </p>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
            <span>Polymarket Mid Curve</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} />
            <span>Dovish News Dot</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a3e635' }} />
            <span>Hawkish News Dot</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={13} />
          <span>Interactive timeline: hover dots to inspect breaking news impact</span>
        </div>
      </div>
    </div>
  );
};

