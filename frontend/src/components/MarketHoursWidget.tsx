import React from 'react';
import { Sun, Moon, Globe, Info } from 'lucide-react';

export const MarketHoursWidget: React.FC = () => {
  return (
    <div className="glass-panel" style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '12px',
      background: 'linear-gradient(180deg, rgba(16, 28, 24, 0.8) 0%, rgba(9, 17, 14, 0.9) 100%)'
    }}>
      {/* Header matching LittleBee's Market hours */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Market Hours & Sessions
          </h4>
          <Info size={14} color="#64748b" />
        </div>
        <Globe size={16} color="#64748b" />
      </div>

      {/* Styled World Map Silhouette with Active Pins (matching LittleBee reference) */}
      <div style={{
        position: 'relative',
        height: '110px',
        borderRadius: '12px',
        background: 'rgba(8, 16, 14, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Subtle grid and map lines */}
        <svg
          viewBox="0 0 300 110"
          style={{ width: '100%', height: '100%', opacity: 0.25 }}
        >
          {/* World landmass outline representation */}
          <path
            d="M 30,30 Q 50,20 70,35 Q 90,50 80,75 Q 60,85 40,65 Z
               M 120,25 Q 150,15 160,35 Q 155,55 130,50 Z
               M 130,55 Q 150,60 145,85 Q 130,95 125,70 Z
               M 190,20 Q 240,15 250,45 Q 230,70 195,50 Z
               M 230,65 Q 260,70 250,90 Q 225,95 230,65 Z"
            fill="#22c55e"
          />
          <line x1="0" y1="55" x2="300" y2="55" stroke="rgba(34, 197, 94, 0.2)" strokeDasharray="2 4" />
        </svg>

        {/* New York Pin */}
        <div style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(10, 24, 18, 0.9)',
          padding: '3px 8px',
          borderRadius: '20px',
          border: '1px solid rgba(74, 222, 128, 0.4)',
          fontSize: '0.65rem',
          fontWeight: 700,
          color: '#f8fafc',
          boxShadow: '0 0 10px rgba(34, 197, 94, 0.3)'
        }}>
          <span>🇺🇸</span>
          <span>New York (CME)</span>
        </div>

        {/* London Pin */}
        <div style={{
          position: 'absolute',
          top: '25px',
          left: '135px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(10, 24, 18, 0.9)',
          padding: '3px 8px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '0.65rem',
          fontWeight: 600,
          color: '#cbd5e1'
        }}>
          <span>🇬🇧</span>
          <span>London</span>
        </div>

        {/* Tokyo Pin */}
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '25px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(10, 24, 18, 0.9)',
          padding: '3px 8px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontSize: '0.65rem',
          fontWeight: 600,
          color: '#cbd5e1'
        }}>
          <span>🇯🇵</span>
          <span>Tokyo</span>
        </div>
      </div>

      {/* Bottom Session Clocks (matching LittleBee's New York / London / Tokyo) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8px',
        textAlign: 'center',
        fontSize: '0.75rem'
      }}>
        <div style={{
          background: 'rgba(8, 16, 14, 0.6)',
          padding: '8px',
          borderRadius: '10px',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#4ade80', marginBottom: '2px' }}>
            <Sun size={12} />
            <span style={{ fontWeight: 700 }}>New York</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            CME Active (2h left)
          </div>
        </div>

        <div style={{
          background: 'rgba(8, 16, 14, 0.6)',
          padding: '8px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8', marginBottom: '2px' }}>
            <Moon size={12} />
            <span style={{ fontWeight: 600 }}>London</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Closed
          </div>
        </div>

        <div style={{
          background: 'rgba(8, 16, 14, 0.6)',
          padding: '8px',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#94a3b8', marginBottom: '2px' }}>
            <Moon size={12} />
            <span style={{ fontWeight: 600 }}>Tokyo</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Opens in 4h 12m
          </div>
        </div>
      </div>
    </div>
  );
};

