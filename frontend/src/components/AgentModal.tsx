import React, { useEffect, useState } from 'react';
import { 
  X, 
  Play, 
  Bot, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  Terminal as TerminalIcon,
  Code
} from 'lucide-react';
import { fetchSources, triggerAgentRun } from '../api';
import { AgentRunResponse, AgentSource } from '../types';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accuracyPct: number | null;
  checksCount: number;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  accuracyPct,
  checksCount
}) => {
  const [selectedSource, setSelectedSource] = useState<string>('fedwatch');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentSteps, setCurrentSteps] = useState<string[]>([
    'Agent session idle. Select a target source and click "Trigger Run" below.'
  ]);
  const [runResult, setRunResult] = useState<AgentRunResponse | null>(null);
  const [sources, setSources] = useState<AgentSource[]>([]);

  // Reload on open so new sources.yaml entries and last-run times show up.
  useEffect(() => {
    if (isOpen) {
      fetchSources().then(setSources);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartRun = async () => {
    setIsRunning(true);
    setRunResult(null);
    setCurrentSteps(['Connecting to TinyFish autonomous browser worker...']);

    try {
      const res = await triggerAgentRun(selectedSource, (steps) => {
        setCurrentSteps(steps);
      });
      setRunResult(res);
      if (res.steps) {
        setCurrentSteps(res.steps);
      }
    } catch (err: any) {
      setCurrentSteps((prev) => [...prev, `Run encountered an error: ${err.message || err}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(3, 7, 5, 0.82)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '20px'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          background: 'rgba(10, 20, 16, 0.98)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(34, 197, 94, 0.15)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(14, 28, 23, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(34, 197, 94, 0.3)'
            }}>
              <Bot size={20} color="#4ade80" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                TinyFish Autonomous Agent Console
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                Autonomous headless web scraper verifying prediction market data
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {/* Accuracy info box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '14px',
            background: 'rgba(16, 32, 26, 0.6)',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={24} color="#4ade80" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                  Agent Accuracy Benchmark: {accuracyPct === null ? '—' : `${accuracyPct}%`}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Tested against Polymarket CLOB ground-truth across {checksCount} validation {checksCount === 1 ? 'check' : 'checks'}.
                </div>
              </div>
            </div>
            <span className="badge-tag badge-good" style={{ padding: '4px 10px' }}>
              HIGH CONFIDENCE
            </span>
          </div>

          {/* Trigger Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                Target Source from sources.yaml
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                disabled={isRunning}
                style={{
                  width: '100%',
                  background: 'rgba(8, 16, 14, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {sources.length === 0 && <option value="">No sources loaded</option>}
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.kind_label} · {s.name}{s.event ? ` (${s.event})` : ''} — last run{' '}
                    {s.last_run ? `${new Date(s.last_run).toISOString().slice(11, 16)} UTC` : 'never'}
                  </option>
                ))}
                {sources.length > 0 && <option value="all">All sources (runs one after another)</option>}
              </select>
            </div>

            <div style={{ marginTop: '22px' }}>
              <button
                className="btn-neon"
                onClick={handleStartRun}
                disabled={isRunning}
                style={{
                  padding: '11px 22px',
                  opacity: isRunning ? 0.7 : 1,
                  cursor: isRunning ? 'wait' : 'pointer'
                }}
              >
                <Play size={16} />
                <span>{isRunning ? 'Agent Browsing...' : 'Trigger Run'}</span>
              </button>
            </div>
          </div>

          {/* Terminal / Live Step Viewer */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                <TerminalIcon size={14} color="#4ade80" />
                <span>Execution Step Log</span>
              </div>
              {isRunning && (
                <span className="badge-tag badge-warn" style={{ fontSize: '0.65rem' }}>
                  POLLING (5s interval)
                </span>
              )}
            </div>

            <div style={{
              background: '#040907',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '12px',
              padding: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {currentSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#4ade80' }}>›</span>
                  <span style={{ color: idx === currentSteps.length - 1 && isRunning ? '#a3e635' : '#e2e8f0' }}>
                    {step}
                  </span>
                </div>
              ))}
              {isRunning && (
                <div style={{ color: '#4ade80', animation: 'pulse-subtle 1.5s infinite' }}>
                  ... [TinyFish headless worker processing DOM mutations]
                </div>
              )}
            </div>
          </div>

          {/* Validated Output Results (if available) */}
          {runResult && runResult.result && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                <Code size={14} color="#4ade80" />
                <span>Schema Validated Output ({runResult.schema_valid ? 'Valid JSON' : 'Raw'})</span>
              </div>
              <pre style={{
                background: '#040907',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: '#86efac',
                overflowX: 'auto',
                margin: 0
              }}>
                {JSON.stringify(runResult.result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(10, 20, 16, 0.8)',
          fontSize: '0.75rem',
          color: '#64748b'
        }}>
          <span>TinyFish API: https://agent.tinyfish.ai (Async run + poll)</span>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '6px 14px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

