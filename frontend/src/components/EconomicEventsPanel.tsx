import React from 'react';
import { Calendar, Bell, Clock, ChevronRight } from 'lucide-react';
import { EconomicEvent } from '../types';

interface EconomicEventsPanelProps {
  events: EconomicEvent[];
}

export const EconomicEventsPanel: React.FC<EconomicEventsPanelProps> = ({ events }) => {
  const getFlag = (country: string) => {
    switch (country) {
      case 'US': return '🇺🇸';
      case 'EU': return '🇪🇺';
      case 'JP': return '🇯🇵';
      case 'UK': return '🇬🇧';
      default: return '🌐';
    }
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
      {/* Header matching LittleBee's Economic Events */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Economic Events
          </h4>
          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
            FOMC Schedule
          </span>
        </div>
        <Calendar size={16} color="#64748b" />
      </div>

      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
        FOMC Cycle • December 2026 Meeting
      </div>

      {/* Events List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {events.map((ev) => (
          <div
            key={ev.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'rgba(8, 16, 14, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>{getFlag(ev.country)}</span>
              <div>
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{ev.title}</div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={10} />
                  <span>{ev.time}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: ev.actual ? '#4ade80' : '#cbd5e1', fontFamily: 'monospace' }}>
                {ev.actual || 'TBD'}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Prev: {ev.previous || '—'}
              </div>
            </div>
          </div>
        ))}
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
        <span>High-volatility Fed catalyst tracker</span>
        <span style={{ color: '#4ade80', fontWeight: 600 }}>CME Implied 72%</span>
      </div>
    </div>
  );
};

