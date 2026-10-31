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

function emptyEvidence(eventId: string): EvidenceResponse {
  return { event_id: eventId, price_history: [], fedwatch: null, articles: [] };
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
        // Backend hasn't completed its first poll yet; the next poll will retry.
        console.warn(`Evidence for ${eventId} still initializing on backend...`);
      }
    } catch (err) {
      console.warn(`Error fetching evidence for ${eventId}`, err);
    }
    // Live mode never shows mock evidence: render empty states instead.
    return { data: emptyEvidence(eventId), isMock: false };
  }

  return { data: MOCK_EVIDENCE_MAP[eventId] || emptyEvidence(eventId), isMock: true };
}

const AGENT_POLL_CEILING_MS = 11 * 60 * 1000;

export async function triggerAgentRun(
  sourceId: string,
  onStepUpdate?: (steps: string[]) => void
): Promise<AgentRunResponse> {
  if (currentMode === 'live') {
    // Live mode never falls back to the mock simulator: errors propagate to the
    // caller so the console shows what really happened.
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId })
    });
    if (!res.ok) {
      throw new Error(`backend returned ${res.status}`);
    }
    const initial: AgentRunResponse = await res.json();
    onStepUpdate?.(initial.steps || []);
    if (initial.status === 'done' || initial.status === 'failed') {
      return initial;
    }

    // TinyFish runs take 1–5 min (queue + browsing) and the backend retries a
    // hung run once, so allow up to AGENT_POLL_CEILING_MS before giving up.
    let last = initial;
    const startTime = Date.now();
    while (Date.now() - startTime < AGENT_POLL_CEILING_MS) {
      await new Promise((r) => setTimeout(r, 5000));
      const pollRes = await fetch(`/api/agent/runs/${initial.run_id}`);
      if (!pollRes.ok) continue;
      last = await pollRes.json();
      onStepUpdate?.(last.steps || []);
      if (last.status === 'done' || last.status === 'failed') {
        return last;
      }
    }
    return {
      ...last,
      steps: [...(last.steps || []), 'Still running on the backend; its result will be cached and shown on the next refresh.']
    };
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

