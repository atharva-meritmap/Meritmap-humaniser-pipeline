// 💰 NOOB EXPLAINER: Why track costs?
// AI APIs charge per word (token). A single humanization of a 1000-word
// essay might cost $0.05 with GPT-4. Over a month, that adds up!
// This tracker helps users understand their spending.

export interface CostEntry {
  date: string;           // YYYY-MM-DD
  provider: string;
  model: string;
  tokens: number;
  costUsd: number;
}

const COST_STORAGE_KEY = 'stealthhumanizer_cost_history';

export function addCostEntry(entry: CostEntry): void {
  if (typeof window === 'undefined') return;
  const history = getCostHistory();
  history.push(entry);
  // Keep last 365 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);
  const filtered = history.filter(e => new Date(e.date) >= cutoff);
  localStorage.setItem(COST_STORAGE_KEY, JSON.stringify(filtered));
}

export function getCostHistory(): CostEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(COST_STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function getDailyCosts(days: number = 30): { date: string; cost: number; tokens: number }[] {
  const history = getCostHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const byDay: Record<string, { cost: number; tokens: number }> = {};
  for (const entry of history) {
    if (new Date(entry.date) < cutoff) continue;
    if (!byDay[entry.date]) byDay[entry.date] = { cost: 0, tokens: 0 };
    byDay[entry.date].cost += entry.costUsd;
    byDay[entry.date].tokens += entry.tokens;
  }
  
  return Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
