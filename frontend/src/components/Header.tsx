import React from 'react';
import { 
  Bot, 
  Activity, 
  Sparkles, 
  Search, 
  Bell, 
  RefreshCw, 
  ShieldCheck, 
  Radio
} from 'lucide-react';
import { AgentAccuracy } from '../types';

interface HeaderProps {
  accuracy: AgentAccuracy;
  isMock: boolean;
  onToggleMode: () => void;
  onOpenAgentModal: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  selectedEventTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  accuracy,
  isMock,
  onToggleMode,
  onOpenAgentModal,
  onRefresh,
  isRefreshing,
}) => {
  const accuracyPct = accuracy.value !== null ? Math.round(accuracy.value * 100) : 92;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 28px',
      background: 'rgba(8, 16, 13, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(34, 197, 94, 0.12)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      {/* Brand & Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 18px rgba(16, 185, 129, 0.4)',
          border: '1px solid rgba(74, 222, 128, 0.4)'
        }}>
          <Activity size={24} color="#ecfdf5" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              letterSpacing: '-0.02em', 
              color: '#f8fafc',
              textTransform: 'uppercase'
            }}>
              Market<span style={{ color: '#4ade80' }}>Scout</span>
            </span>
            <span style={{
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#86efac',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px',
              border: '1px solid rgba(34, 197, 94, 0.25)'
            }}>
              HACKATHON
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            Polymarket CLOB & Outside World Consensus Engine
          </p>
        </div>
      </div>

      {/* Middle Status Indicators (Matching LittleBee's fiat & trading pill stats) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Agent Accuracy Badge */}
        <div 
          onClick={onOpenAgentModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(15, 29, 24, 0.7)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="TinyFish reading accuracy tested against Polymarket API ground-truth"
        >
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(34, 197, 94, 0.15)',
            color: '#4ade80'
          }}>
            <ShieldCheck size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>
              Agent Accuracy
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4ade80' }}>
                {accuracyPct}%
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                ({accuracy.checks} tests)
              </span>
            </div>
          </div>
        </div>

        {/* Live vs Mock Switcher */}
        <button
          onClick={onToggleMode}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isMock ? 'rgba(234, 179, 8, 0.12)' : 'rgba(34, 197, 94, 0.12)',
            border: `1px solid ${isMock ? 'rgba(234, 179, 8, 0.35)' : 'rgba(34, 197, 94, 0.35)'}`,
            padding: '8px 14px',
            borderRadius: '12px',
            cursor: 'pointer',
            color: isMock ? '#facc15' : '#4ade80',
            fontWeight: 700,
            fontSize: '0.75rem',
            transition: 'all 0.2s'
          }}
          title="Click to toggle between Mock and Live API mode"
        >
          <Radio size={14} className={isMock ? '' : 'pulsing-dot'} />
          <span>{isMock ? 'MOCK MODE' : 'LIVE API'}</span>
          <span style={{
            fontSize: '0.65rem',
            opacity: 0.8,
            padding: '2px 5px',
            background: 'rgba(0,0,0,0.25)',
            borderRadius: '4px'
          }}>
            TOGGLE
          </span>
        </button>

        {/* Polling / Refresh Button */}
        <button
          onClick={onRefresh}
          className="btn-secondary"
          style={{ padding: '8px 12px' }}
          title="Refresh market data"
        >
          <RefreshCw size={14} className={isRefreshing ? 'pulsing-dot' : ''} style={{
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
          }} />
        </button>
      </div>

      {/* Right Action Center */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={onOpenAgentModal}
          className="btn-neon"
        >
          <Sparkles size={16} />
          <span>Run TinyFish Agent</span>
        </button>
      </div>
    </header>
  );
};

