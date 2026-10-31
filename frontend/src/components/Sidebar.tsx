import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Compass, 
  Calendar, 
  Terminal, 
  Calculator, 
  ExternalLink,
  ShieldAlert,
  Bot
} from 'lucide-react';

export type TabKey = 'overview' | 'evidence' | 'outside_view' | 'calendar' | 'terminal' | 'calculator';

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  onOpenAgentModal: () => void;
  trackedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAgentModal,
  trackedCount
}) => {
  const navItems: Array<{ key: TabKey; label: string; icon: any; count?: number }> = [
    { key: 'overview', label: 'Markets & Verdicts', icon: LayoutDashboard, count: trackedCount },
    { key: 'evidence', label: 'Evidence & Charts', icon: TrendingUp },
    { key: 'outside_view', label: 'CME FedWatch', icon: Compass },
    { key: 'calendar', label: 'Economic Events', icon: Calendar },
    { key: 'calculator', label: 'Depth Calculator', icon: Calculator },
    { key: 'terminal', label: 'Agent Terminal', icon: Terminal }
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'rgba(8, 16, 13, 0.95)',
      borderRight: '1px solid rgba(34, 197, 94, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '24px 16px',
      height: 'calc(100vh - 75px)',
      position: 'sticky',
      top: '75px',
      boxSizing: 'border-box'
    }}>
      {/* Top Nav List */}
      <div>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '12px',
          paddingLeft: '12px'
        }}>
          Navigation
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelectTab(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: isActive ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid transparent',
                  background: isActive 
                    ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)' 
                    : 'transparent',
                  color: isActive ? '#4ade80' : '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.color = '#e2e8f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} color={isActive ? '#4ade80' : '#64748b'} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span style={{
                    fontSize: '0.7rem',
                    background: isActive ? 'rgba(34, 197, 94, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                    color: isActive ? '#86efac' : '#94a3b8',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontWeight: 700
                  }}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Feature Card (Inspired by LittleBee's "Profit more with LittleBee NFT") */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          background: 'linear-gradient(180deg, rgba(20, 36, 30, 0.8) 0%, rgba(10, 20, 16, 0.9) 100%)',
          borderRadius: '18px',
          padding: '16px',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(74, 222, 128, 0.2) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={16} color="#4ade80" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>
              TinyFish Agent
            </span>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4, margin: '0 0 12px 0' }}>
            Browses CME FedWatch and financial news sites with zero API needed.
          </p>

          <button
            onClick={onOpenAgentModal}
            style={{
              width: '100%',
              background: '#f8fafc',
              color: '#091510',
              fontWeight: 700,
              fontSize: '0.75rem',
              padding: '8px 12px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#4ade80'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
          >
            <span>Trigger Scraping</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Footer info & Disclaimer link */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          fontSize: '0.7rem',
          color: '#475569'
        }}>
          <span>v0.9.4 Beta</span>
          <a 
            href="https://github.com/suraj-sloth/MarketScout" 
            target="_blank" 
            rel="noreferrer" 
            style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            GitHub Repo
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </aside>
  );
};

