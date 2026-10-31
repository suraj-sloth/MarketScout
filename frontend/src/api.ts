import { MarketsResponse, EvidenceResponse, AgentRunResponse } from './types';
import { MOCK_MARKETS_RESPONSE, MOCK_EVIDENCE_MAP, MOCK_AGENT_RUNS } from './mockData';

// Allow runtime override or environment variable
let currentMode: 'mock' | 'live' = 
  (import.meta.env.VITE_API_MODE as string) === 'live' ? 'live' : 'mock';

export function getApiMode(): 'mock' | 'live' {
  return currentMode;
}

export function setApiMode(mode: 'mock' | 'live') {
  currentMode = mode;
}

export async function checkBackendHealth(): Promise<{ online: boolean; details?: any }> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return { online: true, details: data };
    }
  } catch {
    // offline or unreachable
  }
  return { online: false };
}

export async function fetchMarkets(): Promise<{ data: MarketsResponse; isMock: boolean }> {
  if (currentMode === 'live') {
    try {
      const res = await fetch('/api/markets', { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch (err) {
      console.warn('Backend unreachable, falling back to cached contract data', err);
    }
  }
  return { data: MOCK_MARKETS_RESPONSE, isMock: true };
}

export async function fetchEvidence(eventId: string): Promise<{ data: EvidenceResponse; isMock: boolean }> {
  if (currentMode === 'live') {
    try {
      const res = await fetch(`/api/markets/${encodeURIComponent(eventId)}/evidence`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
      if (res.status === 404) {
        // Backend hasn't completed initial poll yet, retry once or fallback gracefully
        console.warn(`Evidence for ${eventId} still initializing on backend...`);
      }
    } catch (err) {
      console.warn(`Error fetching evidence for ${eventId}, falling back to mock`, err);
    }
  }

  const mock = MOCK_EVIDENCE_MAP[eventId] || {
    event_id: eventId,
    price_history: [],
    fedwatch: null,
    articles: []
  };
  return { data: mock, isMock: true };
}

export async function triggerAgentRun(
  sourceId: string,
  onStepUpdate?: (steps: string[]) => void
): Promise<AgentRunResponse> {
  if (currentMode === 'live') {
    try {
      const res = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: sourceId })
      });

      if (res.ok) {
        const initial = await res.json();
        if (initial.status === 'done' || initial.status === 'failed') {
          return initial;
        }

        // Poll until completion
        const runId = initial.run_id;
        const startTime = Date.now();
        const timeoutMs = 60000; // 1 min poll ceiling

        while (Date.now() - startTime < timeoutMs) {
          await new Promise((r) => setTimeout(r, 3000));
          const pollRes = await fetch(`/api/agent/runs/${runId}`);
          if (pollRes.ok) {
            const runState: AgentRunResponse = await pollRes.json();
            if (onStepUpdate && runState.steps) {
              onStepUpdate(runState.steps);
            }
            if (runState.status === 'done' || runState.status === 'failed') {
              return runState;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Live agent run failed, falling back to mock simulator', e);
    }
  }

  // Simulated animated run for mock demo
  const sample = MOCK_AGENT_RUNS[sourceId] || MOCK_AGENT_RUNS['fedwatch'];
  const fullSteps = sample.steps || [];
  
  if (onStepUpdate) {
    for (let i = 1; i <= fullSteps.length; i++) {
      onStepUpdate(fullSteps.slice(0, i));
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  return {
    ...sample,
    run_id: `mock_${Date.now()}`
  };
}

