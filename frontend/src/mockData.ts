import { MarketsResponse, EvidenceResponse, AgentRunResponse, EconomicEvent } from './types';

export const MOCK_MARKETS_RESPONSE: MarketsResponse = {
  as_of: new Date().toISOString(),
  agent_accuracy: { value: 0.92, checks: 12 },
  markets: [
    {
      event_id: 'fed-dec',
      question: 'Will there be no change in Fed interest rates in December?',
      url: 'https://polymarket.com/event/fed-decision-in-december-20260729232808632',
      end_date: '2026-12-16',
      p_yes: 0.64,
      yes_bid: 0.62,
      yes_ask: 0.66,
      no_bid: 0.34,
      no_ask: 0.38,
      spread_pts: 4.0,
      depth_usd: 18000,
      incoherence_pts: 0.0,
      last_change: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      verdict: 'check',
      checks: [
        { name: 'spread', status: 'warn', detail: '4 pts (target ≤ 3)' },
        { name: 'depth', status: 'ok', detail: '$18k resting in 5% band' },
        { name: 'coherence', status: 'ok', detail: 'YES and NO books agree' },
        { name: 'freshness', status: 'ok', detail: 'changed 50 min ago' },
        { name: 'fedwatch_gap', status: 'warn', detail: 'FedWatch 72% vs 64% (-8 pts)' },
        { name: 'news_reaction', status: 'warn', detail: '2 articles, price flat 60 min' }
      ],
      sentiment: { value: -0.6, label: 'leans NO', n_articles: 4 }
    },
    {
      event_id: 'btc-150k-dec',
      question: 'Will Bitcoin reach $150,000 before December 31, 2026?',
      url: 'https://polymarket.com/event/what-price-will-bitcoin-hit-in-2026',
      end_date: '2026-12-31',
      p_yes: 0.21,
      yes_bid: 0.20,
      yes_ask: 0.22,
      no_bid: 0.78,
      no_ask: 0.80,
      spread_pts: 2.0,
      depth_usd: 54000,
      incoherence_pts: 0.0,
      last_change: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      verdict: 'good',
      checks: [
        { name: 'spread', status: 'ok', detail: '2 pts tight spread' },
        { name: 'depth', status: 'ok', detail: '$54k deep liquidity' },
        { name: 'coherence', status: 'ok', detail: 'YES and NO agree' },
        { name: 'freshness', status: 'ok', detail: 'changed 2 min ago' },
        { name: 'news_reaction', status: 'ok', detail: 'price followed 3 of 3 articles' }
      ],
      sentiment: { value: 0.15, label: 'mixed', n_articles: 5 }
    },
    {
      event_id: 'gov-shutdown-dec',
      question: 'Will there be a US government shutdown in December?',
      url: 'https://polymarket.com/event/us-government-shutdown',
      end_date: '2026-12-31',
      p_yes: 0.40,
      yes_bid: 0.29,
      yes_ask: 0.51,
      no_bid: 0.49,
      no_ask: 0.71,
      spread_pts: 22.0,
      depth_usd: 600,
      incoherence_pts: 0.0,
      last_change: new Date(Date.now() - 9.5 * 3600 * 1000).toISOString(),
      verdict: 'unreliable',
      checks: [
        { name: 'spread', status: 'bad', detail: '22 pts wide spread' },
        { name: 'depth', status: 'bad', detail: '$600 dangerously thin' },
        { name: 'coherence', status: 'ok', detail: 'YES and NO agree' },
        { name: 'freshness', status: 'bad', detail: 'stale (> 9h since tick)' },
        { name: 'news_reaction', status: 'ok', detail: 'no relevant news clusters' }
      ],
      sentiment: { value: 0.0, label: 'neutral', n_articles: 0 }
    }
  ]
};

// Generate realistic 24h price history
const nowTs = Date.now();
const generatePoints = (baseP: number, volatility: number, count = 30) => {
  const points = [];
  let curr = baseP;
  for (let i = count; i >= 0; i--) {
    const time = new Date(nowTs - i * 30 * 60 * 1000).toISOString();
    const noise = (Math.random() - 0.48) * volatility;
    curr = Math.max(0.05, Math.min(0.95, curr + noise));
    points.push({ t: time, p: parseFloat(curr.toFixed(3)) });
  }
  return points;
};

export const MOCK_EVIDENCE_MAP: Record<string, EvidenceResponse> = {
  'fed-dec': {
    event_id: 'fed-dec',
    price_history: generatePoints(0.64, 0.015, 36),
    fedwatch: {
      p: 0.72,
      meeting_date: '2026-12-16',
      url: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html',
      ts: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      from_cache: false,
      probabilities: [
        { range_bps: '350-375', prob: 0.72 },
        { range_bps: '375-400', prob: 0.28 },
        { range_bps: '400-425', prob: 0.0 }
      ]
    },
    articles: [
      {
        source: 'Reuters',
        headline: 'Fed officials signal patience on further rate adjustments',
        url: 'https://www.reuters.com/markets/us/',
        published_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        direction: -1,
        reason: 'Two FOMC voting members stated they "favour holding rates" into Q1 2027.',
        reaction: 'unreacted',
        delta_p_pts: 0.0
      },
      {
        source: 'CNBC',
        headline: 'Fed Governor urges steady hand as headline PCE stays sticky',
        url: 'https://www.cnbc.com/economy',
        published_at: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
        direction: -1,
        reason: 'Highlighted that financial conditions remain loose and cutting hastily carries risk.',
        reaction: 'unreacted',
        delta_p_pts: 0.0
      },
      {
        source: 'Bloomberg',
        headline: 'Initial jobless claims jump unexpectedly to 242,000',
        url: 'https://www.bloomberg.com/markets',
        published_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
        direction: 1,
        reason: 'Labor softness renewed speculative calls for an immediate 25bps cut.',
        reaction: 'counter',
        delta_p_pts: -1.2
      },
      {
        source: 'Financial Times',
        headline: 'Bond yields hover near two-month highs prior to Powell remarks',
        url: 'https://www.ft.com/global-economy',
        published_at: new Date(Date.now() - 210 * 60 * 1000).toISOString(),
        direction: 0,
        reason: 'Market desks report range-bound trading awaiting upcoming dot plot release.',
        reaction: 'neutral',
        delta_p_pts: 0.0
      }
    ]
  },
  'btc-150k-dec': {
    event_id: 'btc-150k-dec',
    price_history: generatePoints(0.21, 0.02, 36),
    fedwatch: null,
    articles: [
      {
        source: 'CoinDesk',
        headline: 'Institutional ETF inflows top $1.2B in single week surge',
        url: 'https://www.coindesk.com',
        published_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        direction: 1,
        reason: 'Massive sovereign wealth allocation rumors spark heavy derivatives buying.',
        reaction: 'reacted',
        delta_p_pts: 2.1
      },
      {
        source: 'Bloomberg Crypto',
        headline: 'Options market pricing low probability for year-end blow-off top',
        url: 'https://www.bloomberg.com/crypto',
        published_at: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
        direction: -1,
        reason: 'Implied volatility skew indicates protective put buying above $110k.',
        reaction: 'reacted',
        delta_p_pts: -1.5
      }
    ]
  },
  'gov-shutdown-dec': {
    event_id: 'gov-shutdown-dec',
    price_history: generatePoints(0.40, 0.005, 36),
    fedwatch: null,
    articles: []
  }
};

export const MOCK_AGENT_RUNS: Record<string, AgentRunResponse> = {
  fedwatch: {
    run_id: 'r_fw_demo',
    status: 'done',
    source_id: 'fedwatch',
    steps: [
      'Initialized browser sandbox session',
      'Opened https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html',
      'Accepted disclaimer & navigated to target December FOMC contract table',
      'Extracted basis points ranges & computed conditional probabilities',
      'Parsed probabilities: 350-375 bps @ 72.0%, 375-400 bps @ 28.0%',
      'Cross-checked with Polymarket CLOB book: divergence gap is -8.0 pts'
    ],
    result: {
      meeting_date: '2026-12-16',
      probabilities: [
        { range_bps: '350-375', prob: 0.72 },
        { range_bps: '375-400', prob: 0.28 }
      ]
    },
    schema_valid: true,
    from_cache: false
  },
  pm_page_fed: {
    run_id: 'r_pm_demo',
    status: 'done',
    source_id: 'pm_page_fed',
    steps: [
      'Navigated to https://polymarket.com/event/fed-decision-in-december-20260729232808632',
      'Waited for DOM hydration of React probability badges',
      'Extracted displayed probabilities: "No Change" = 64%',
      'Fetched Gamma API ground truth: mid = 64.0%',
      'Accuracy verification: error 0.0 pts (<= 2 pts threshold) -> MATCH'
    ],
    result: {
      outcomes: [
        { name: 'No Change', prob: 0.64 },
        { name: 'Cut 25 bps', prob: 0.32 },
        { name: 'Cut 50+ bps', prob: 0.04 }
      ]
    },
    schema_valid: true,
    from_cache: false
  },
  news_cnbc_fed: {
    run_id: 'r_news_demo',
    status: 'done',
    source_id: 'news_cnbc_fed',
    steps: [
      'Connected to Reuters US Markets RSS & live feed',
      'Identified 4 FOMC related articles published within last 48 hours',
      'Classified directional bias and extracted verbatim quotations',
      'Computed net sentiment index: -0.60 (leans NO)',
      'Tagged price reaction: 2 unreacted stories detected'
    ],
    result: {
      items: [
        {
          headline: 'Fed officials signal patience on further rate cuts',
          url: 'https://www.reuters.com/markets/us/',
          published_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          direction: -1,
          reason: 'Two FOMC officials said they favour holding rates through year-end.'
        }
      ]
    },
    schema_valid: true,
    from_cache: false
  }
};

export const MOCK_ECONOMIC_EVENTS: EconomicEvent[] = [
  { id: 'ev1', time: '14:30 UTC', title: 'US Core PCE Price Index (MoM)', country: 'US', actual: '0.3%', forecast: '0.2%', previous: '0.2%', impact: 'high' },
  { id: 'ev2', time: '15:45 UTC', title: 'Fed Chair Powell Speech', country: 'US', impact: 'high' },
  { id: 'ev3', time: '18:00 UTC', title: 'CME Fed Funds Futures Settlement', country: 'US', actual: '96.25', previous: '96.22', impact: 'medium' },
  { id: 'ev4', time: '07:00 UTC', title: 'UK GDP (MoM)', country: 'UK', actual: '0.1%', forecast: '0.2%', previous: '-0.1%', impact: 'medium' },
  { id: 'ev5', time: '01:30 UTC', title: 'Japan BOJ Policy Rate Decision', country: 'JP', actual: '0.25%', forecast: '0.25%', impact: 'high' }
];

