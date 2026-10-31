export type VerdictType = 'good' | 'check' | 'unreliable';
export type CheckStatus = 'ok' | 'warn' | 'bad';

export interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface Sentiment {
  value: number;
  label: string;
  n_articles: number;
}

export interface Market {
  event_id: string;
  question: string;
  url: string;
  end_date: string | null;
  p_yes: number | null;
  yes_bid: number | null;
  yes_ask: number | null;
  no_bid: number | null;
  no_ask: number | null;
  spread_pts: number | null;
  depth_usd: number;
  incoherence_pts: number | null;
  last_change: string | null;
  verdict: VerdictType;
  checks: Check[];
  sentiment: Sentiment;
}

export interface AgentAccuracy {
  value: number | null;
  checks: number;
}

export interface MarketsResponse {
  as_of: string;
  agent_accuracy: AgentAccuracy;
  markets: Market[];
}

export interface PricePoint {
  t: string;
  p: number;
}

export interface FedWatchData {
  p: number;
  meeting_date: string;
  url: string;
  ts: string;
  from_cache: boolean;
  probabilities?: Array<{ range_bps: string; prob: number }>;
}

export type ArticleReaction = 'reacted' | 'counter' | 'unreacted' | 'flat' | 'neutral' | 'pending';

export interface Article {
  source: string;
  headline: string;
  url: string;
  published_at: string;
  direction: number; // 1 = cut/more likely, -1 = hold/hike/less likely, 0 = neutral
  reason: string;
  reaction: ArticleReaction;
  delta_p_pts: number;
}

export interface EvidenceResponse {
  event_id: string;
  price_history: PricePoint[];
  fedwatch: FedWatchData | null;
  articles: Article[];
}

export interface AgentRunResponse {
  run_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  source_id: string;
  steps: string[];
  result?: {
    meeting_date?: string;
    probabilities?: Array<{ range_bps: string; prob: number }>;
    outcomes?: Array<{ name: string; prob: number }>;
    items?: Array<{
      headline: string;
      url: string;
      published_at: string;
      direction: number;
      reason: string;
    }>;
  };
  schema_valid?: boolean;
  from_cache?: boolean;
  error?: string;
}

export interface EconomicEvent {
  id: string;
  time: string;
  title: string;
  country: 'US' | 'EU' | 'JP' | 'UK';
  actual?: string;
  forecast?: string;
  previous?: string;
  impact: 'high' | 'medium' | 'low';
}

