import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabKey } from './components/Sidebar';
import { MarketHeroChart } from './components/MarketHeroChart';
import { DepthCalculator } from './components/DepthCalculator';
import { MarketCardsGrid } from './components/MarketCardsGrid';
import { EconomicEventsPanel } from './components/EconomicEventsPanel';
import { NewsReactionFeed } from './components/NewsReactionFeed';
import { PaperTradingPanel } from './components/PaperTradingPanel';
import { MarketHoursWidget } from './components/MarketHoursWidget';
import { AgentModal } from './components/AgentModal';
import { 
  fetchMarkets, 
  fetchEvidence, 
  getApiMode, 
  setApiMode 
} from './api';
import { 
  MarketsResponse, 
  EvidenceResponse, 
  Market 
} from './types';
import { 
  MOCK_MARKETS_RESPONSE, 
  MOCK_EVIDENCE_MAP, 
  MOCK_ECONOMIC_EVENTS 
} from './mockData';
import { AlertCircle } from 'lucide-react';
import './styles/theme.css';

export const App: React.FC = () => {
  const [marketsData, setMarketsData] = useState<MarketsResponse>(MOCK_MARKETS_RESPONSE);
  const [selectedMarket, setSelectedMarket] = useState<Market>(MOCK_MARKETS_RESPONSE.markets[0]);
  const [evidenceData, setEvidenceData] = useState<EvidenceResponse>(
    MOCK_EVIDENCE_MAP['fed-dec'] || {
      event_id: 'fed-dec',
      price_history: [],
      fedwatch: null,
      articles: []
    }
  );

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isMock, setIsMock] = useState<boolean>(getApiMode() === 'mock');
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Data fetching handler
  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const { data: mData, isMock: mockMode } = await fetchMarkets();
      setMarketsData(mData);
      setRefreshKey((k) => k + 1);
      setIsMock(mockMode);

      // Keep selected market in sync or select first
      const currentSelectedId = selectedMarket?.event_id;
      const updatedSelected = mData.markets.find((m) => m.event_id === currentSelectedId) || mData.markets[0];
      if (updatedSelected) {
        setSelectedMarket(updatedSelected);
        const { data: eData } = await fetchEvidence(updatedSelected.event_id);
        setEvidenceData(eData);
      }
    } catch (err) {
      console.error('Failed to load market scout data', err);
    } finally {
      if (showIndicator) setIsRefreshing(false);
    }
  }, [selectedMarket?.event_id]);

  // Initial load and polling every 8s
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(false);
    }, 8000);
    return () => clearInterval(interval);
  }, [loadData]);

  // When selected market changes, fetch evidence
  const handleSelectMarket = async (market: Market) => {
    setSelectedMarket(market);
    try {
      const { data: eData } = await fetchEvidence(market.event_id);
      setEvidenceData(eData);
    } catch (e) {
      console.warn('Error loading evidence for selected market', e);
    }
  };

  const handleToggleMode = () => {
    const next = isMock ? 'live' : 'mock';
    setApiMode(next);
    setIsMock(next === 'mock');
    loadData(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* Top Header */}
      <Header
        accuracy={marketsData.agent_accuracy}
        isMock={isMock}
        onToggleMode={handleToggleMode}
        onOpenAgentModal={() => setIsAgentModalOpen(true)}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        selectedEventTitle={selectedMarket?.question || ''}
      />

      {/* Mock Mode Alert Banner if in Mock Mode */}
      {isMock && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.18) 0%, rgba(161, 98, 7, 0.15) 100%)',
          borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
          padding: '6px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#facc15',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} />
            <span>MOCK DATA MODE ACTIVE — Displaying verified contract fixtures from contract/*.json</span>
          </div>
          <button
            onClick={handleToggleMode}
            style={{
              background: 'rgba(234, 179, 8, 0.25)',
              border: '1px solid rgba(234, 179, 8, 0.4)',
              color: '#fef08a',
              borderRadius: '6px',
              padding: '2px 8px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: 700
            }}
          >
            Switch to Live API
          </button>
        </div>
      )}

      {/* Main App Layout: Sidebar + Dashboard */}
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'terminal') {
              setIsAgentModalOpen(true);
            }
          }}
          onOpenAgentModal={() => setIsAgentModalOpen(true)}
          trackedCount={marketsData.markets.length}
        />

        {/* Main Content Area */}
        <main style={{
          flex: 1,
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '1600px',
          boxSizing: 'border-box',
          overflowY: 'auto'
        }}>
          {/* Top Section: Hero Price Chart (Left 65%) + Depth / Slippage Calculator (Right 35%) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.85fr) minmax(320px, 1fr)',
            gap: '20px',
            alignItems: 'stretch'
          }}>
            <MarketHeroChart
              market={selectedMarket}
              priceHistory={evidenceData.price_history}
              articles={evidenceData.articles}
              fedwatch={evidenceData.fedwatch}
            />

            <DepthCalculator
              market={selectedMarket}
              fedwatch={evidenceData.fedwatch}
            />
          </div>

          {/* Middle Section: Audited Market Cards Grid */}
          <MarketCardsGrid
            markets={marketsData.markets}
            selectedEventId={selectedMarket.event_id}
            onSelectMarket={handleSelectMarket}
          />

          {/* Automated paper trading, triggered by TinyFish runs (simulated) */}
          <PaperTradingPanel refreshKey={refreshKey} />

          {/* Bottom Row: News Reaction Feed + Market Hours. Economic events are
              sample data with no live source, so they only appear in mock mode. */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMock ? '1fr 1.25fr 1fr' : '1.25fr 1fr',
            gap: '20px'
          }}>
            {isMock && <EconomicEventsPanel events={MOCK_ECONOMIC_EVENTS} />}
            <NewsReactionFeed articles={evidenceData.articles} />
            <MarketHoursWidget />
          </div>

          {/* Footer Disclaimer per planning.md §7 & §10 */}
          <footer style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 0 24px 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.72rem',
            color: '#64748b'
          }}>
            <div>
              <strong>Disclaimer:</strong> Not financial advice. MarketScout verdicts evaluate prediction market pricing quality, orderbook depth and outside world consistency, not real-world event outcomes.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>Polymarket Gamma & CLOB</span>
              <span>•</span>
              <span>CME FedWatch Futures</span>
              <span>•</span>
              <span>TinyFish Web Agent</span>
            </div>
          </footer>
        </main>
      </div>

      {/* TinyFish Agent Console Modal */}
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        accuracyPct={marketsData.agent_accuracy.value !== null ? Math.round(marketsData.agent_accuracy.value * 100) : null}
        checksCount={marketsData.agent_accuracy.checks}
      />
    </div>
  );
};
