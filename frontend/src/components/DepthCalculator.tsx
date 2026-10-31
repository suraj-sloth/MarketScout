import React, { useState } from 'react';
import { Calculator, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Market, FedWatchData } from '../types';

interface DepthCalculatorProps {
  market: Market;
  fedwatch: FedWatchData | null;
}

export const DepthCalculator: React.FC<DepthCalculatorProps> = ({ market, fedwatch }) => {
  const currentMid = market.p_yes || 0.64;
  const outsideMid = fedwatch?.p || 0.72;

  const [orderSizeUsd, setOrderSizeUsd] = useState<number>(2500);
  const [targetProb, setTargetProb] = useState<number>(outsideMid);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(1.5);

  // Depth in 5% band from book
  const depth5Band = market.depth_usd || 18000;

  // Theoretical shares obtained
  const sharesObtained = Math.floor(orderSizeUsd / currentMid);

  // Slippage approximation based on order size vs depth
  const estimatedSlippagePts = (orderSizeUsd / Math.max(depth5Band, 1000)) * 2.5;

  // Implied edge vs outside view (FedWatch)
  const edgePts = (targetProb - currentMid) * 100;
  const impliedEdgeUsd = (sharesObtained * (targetProb - currentMid));

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: '16px',
      background: 'linear-gradient(180deg, rgba(16, 28, 24, 0.8) 0%, rgba(9, 17, 14, 0.9) 100%)'
    }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Position & Depth Inspector
          </span>
          <Calculator size={16} color="#4ade80" />
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          Order Impact & Edge Calculator
        </h3>
      </div>

      {/* Inputs Grid (matching LittleBee's 2x2 grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Order Capital ($USD)
          </label>
          <input
            type="number"
            value={orderSizeUsd}
            onChange={(e) => setOrderSizeUsd(Math.max(10, parseFloat(e.target.value) || 0))}
            style={{
              width: '100%',
              background: 'rgba(8, 16, 14, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '8px 12px',
              color: '#f8fafc',
              fontSize: '0.9rem',
              fontWeight: 600
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Venue / Asset
          </label>
          <div style={{
            background: 'rgba(8, 16, 14, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#4ade80',
            fontSize: '0.85rem',
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            Polymarket YES
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Polymarket Ask Mid
          </label>
          <div style={{
            background: 'rgba(8, 16, 14, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#f8fafc',
            fontSize: '0.85rem',
            fontFamily: 'monospace'
          }}>
            ${currentMid.toFixed(4)}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            Outside Implied Prob
          </label>
          <div style={{
            background: 'rgba(8, 16, 14, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#facc15',
            fontSize: '0.85rem',
            fontFamily: 'monospace'
          }}>
            ${targetProb.toFixed(4)} (CME)
          </div>
        </div>
      </div>

      {/* Sizing button (Neon accent button matching LittleBee's "Calculate") */}
      <button
        className="btn-neon"
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '12px'
        }}
        onClick={() => {
          // Trigger slight calculation animation or sound if needed
        }}
      >
        <span>Evaluate Market Slippage</span>
        <ArrowRight size={16} />
      </button>

      {/* Output results (matching LittleBee's Units deal size & Amount at risk boxes) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{
          background: 'rgba(10, 20, 16, 0.7)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(34, 197, 94, 0.15)'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
            Deal Size (Shares)
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
            {sharesObtained.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#4ade80', marginTop: '2px' }}>
            Spread: {market.spread_pts?.toFixed(1) || '4.0'} pts
          </div>
        </div>

        <div style={{
          background: 'rgba(10, 20, 16, 0.7)',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid rgba(34, 197, 94, 0.15)'
        }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
            Estimated Slippage
          </div>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 800,
            color: estimatedSlippagePts > 2 ? '#f87171' : '#4ade80',
            fontFamily: 'monospace'
          }}>
            ~{estimatedSlippagePts.toFixed(2)} pts
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
            in ${(depth5Band / 1000).toFixed(0)}k book depth
          </div>
        </div>
      </div>

      {/* Bottom Summary Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderRadius: '10px',
        background: edgePts > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
        border: `1px solid ${edgePts > 0 ? 'rgba(34, 197, 94, 0.25)' : 'rgba(234, 179, 8, 0.25)'}`
      }}>
        <ShieldCheck size={16} color={edgePts > 0 ? '#4ade80' : '#facc15'} />
        <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
          {edgePts > 0 
            ? `CME FedWatch indicates a +${edgePts.toFixed(1)} pt divergence ($${Math.abs(impliedEdgeUsd).toFixed(0)} edge).`
            : `Polymarket and CME are in equilibrium (difference < 2 pts).`}
        </span>
      </div>
    </div>
  );
};

