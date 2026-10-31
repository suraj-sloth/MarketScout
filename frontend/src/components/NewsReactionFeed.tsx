import React from 'react';
import { Newspaper, ExternalLink, ArrowUpRight, ArrowDownRight, Minus, List } from 'lucide-react';
import { Article } from '../types';

interface NewsReactionFeedProps {
  articles: Article[];
}

export const NewsReactionFeed: React.FC<NewsReactionFeedProps> = ({ articles }) => {
  const getReactionBadge = (reaction: Article['reaction']) => {
    switch (reaction) {
      case 'reacted':
        return (
          <span className="badge-tag badge-good" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
            REACTED
          </span>
        );
      case 'unreacted':
        return (
          <span className="badge-tag badge-warn" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
            UNREACTED
          </span>
        );
      case 'counter':
        return (
          <span className="badge-tag badge-bad" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
            COUNTER-MOVE
          </span>
        );
      default:
        return (
          <span className="badge-tag" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '0.65rem', padding: '2px 6px' }}>
            NEUTRAL
          </span>
        );
    }
  };

  const getDirectionIcon = (direction: number) => {
    if (direction > 0) return <ArrowUpRight size={13} color="#4ade80" />;
    if (direction < 0) return <ArrowDownRight size={13} color="#f87171" />;
    return <Minus size={13} color="#94a3b8" />;
  };

  return (
    <div className="glass-panel" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '12px',
      background: 'linear-gradient(180deg, rgba(16, 28, 24, 0.8) 0%, rgba(9, 17, 14, 0.9) 100%)'
    }}>
      {/* Header matching LittleBee's Markets list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            News Reaction Feed
          </h4>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            TinyFish Scraped
          </span>
        </div>
        <List size={16} color="#64748b" />
      </div>

      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
        Price Impact Audit (Δp within 60 min of publication)
      </div>

      {/* Articles Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
        {articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '0.8rem' }}>
            No news clusters detected for this market yet.
          </div>
        ) : (
          articles.map((art, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '10px',
                borderRadius: '10px',
                background: 'rgba(8, 16, 14, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
                <div style={{
                  padding: '4px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  marginTop: '2px'
                }}>
                  {getDirectionIcon(art.direction)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4ade80' }}>
                      {art.source}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                      {new Date(art.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <a
                    href={art.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      textDecoration: 'none',
                      lineHeight: 1.3,
                      display: 'block'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#4ade80'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#f1f5f9'; }}
                  >
                    {art.headline}
                  </a>
                  <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '4px 0 0 0', fontStyle: 'italic' }}>
                    "{art.reason}"
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                {getReactionBadge(art.reaction)}
                <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: art.delta_p_pts ? '#4ade80' : '#94a3b8' }}>
                  {art.delta_p_pts === null ? '—' : `${art.delta_p_pts > 0 ? '+' : ''}${art.delta_p_pts.toFixed(1)} pts`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.7rem',
        color: '#64748b',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <span>Deduplicated across Reuters & Bloomberg</span>
        <span style={{ color: '#4ade80', fontWeight: 600 }}>{articles.length} Validated</span>
      </div>
    </div>
  );
};

