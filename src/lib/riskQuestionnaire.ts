import type { AssetCategory } from '../types';

export type RiskProfileName = 'conservative' | 'moderate' | 'balanced' | 'growth' | 'aggressive';

export interface RiskProfile {
  id: RiskProfileName;
  label: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
  // Strategic asset allocation targets
  targets: Record<AssetCategory, number>;
  // Constraints
  maxEquity: number;
  minEquity: number;
  maxDrawdown: number;
  targetVolatility: number;
  // Modelling preferences
  riskFreeRate: number;
  monteCarloSimulations: number;
  goalSuccessThreshold: number; // minimum acceptable probability of success
  // Glide path
  equityAtRetirement: number;
  // Persona
  persona: string;
  recommendedApproach: string;
}

export interface RiskQuestion {
  id: string;
  category: 'time' | 'capacity' | 'attitude' | 'experience' | 'liquidity' | 'goals';
  text: string;
  options: {
    label: string;
    score: number;
    description?: string;
  }[];
}

export const RISK_QUESTIONS: RiskQuestion[] = [
  {
    id: 'time-horizon',
    category: 'time',
    text: 'When do you expect to need a meaningful portion of this portfolio?',
    options: [
      { label: 'Within 3 years', score: 1, description: 'Capital preservation is critical' },
      { label: '3 to 7 years', score: 3, description: 'Some growth, but stability matters' },
      { label: '7 to 15 years', score: 5, description: 'Balance growth and drawdowns' },
      { label: '15 to 25 years', score: 7, description: 'Growth-oriented' },
      { label: 'More than 25 years', score: 10, description: 'Maximise long-term compounding' },
    ],
  },
  {
    id: 'income-stability',
    category: 'capacity',
    text: 'How stable is your primary income / cash flow?',
    options: [
      { label: 'Very unstable / seasonal', score: 1, description: 'Irregular freelance, commission, or business income' },
      { label: 'Somewhat unstable', score: 3, description: 'Variable but predictable range' },
      { label: 'Stable with moderate growth', score: 5, description: 'Salaried with annual increments' },
      { label: 'Very stable', score: 7, description: 'Tenured, government, or recession-resistant' },
      { label: 'Stable and growing rapidly', score: 10, description: 'High-growth career or business' },
    ],
  },
  {
    id: 'loss-reaction',
    category: 'attitude',
    text: 'If your portfolio fell 20% in a market correction, what would you most likely do?',
    options: [
      { label: 'Sell everything immediately', score: 1 },
      { label: 'Sell a portion and move to safer assets', score: 3 },
      { label: 'Hold and wait for recovery', score: 6 },
      { label: 'Buy more if fundamentals are intact', score: 9 },
      { label: 'Aggressively add more equity', score: 10 },
    ],
  },
  {
    id: 'experience',
    category: 'experience',
    text: 'How much experience do you have with volatile investments (equity, equity funds, alternatives)?',
    options: [
      { label: 'None', score: 1 },
      { label: 'Limited — mostly FDs / debt funds', score: 3 },
      { label: 'Some — occasional equity / balanced funds', score: 5 },
      { label: 'Experienced — direct equity and ETFs', score: 8 },
      { label: 'Professional / very experienced', score: 10 },
    ],
  },
  {
    id: 'liquidity',
    category: 'liquidity',
    text: 'How much of your portfolio must remain easily accessible (liquid) at all times?',
    options: [
      { label: 'More than 40%', score: 1, description: 'High liquidity need' },
      { label: '25% to 40%', score: 3 },
      { label: '15% to 25%', score: 5 },
      { label: '5% to 15%', score: 8 },
      { label: 'Less than 5%', score: 10, description: 'Long-term capital, liquidity handled elsewhere' },
    ],
  },
  {
    id: 'goals-essential',
    category: 'goals',
    text: 'What portion of your goals are essential (must be met) vs aspirational?',
    options: [
      { label: 'Mostly essential goals', score: 2, description: 'Little room for risk' },
      { label: 'More essential than aspirational', score: 4 },
      { label: 'Balanced', score: 6 },
      { label: 'More aspirational than essential', score: 8 },
      { label: 'Mostly aspirational / legacy', score: 10 },
    ],
  },
  {
    id: 'drawdown-tolerance',
    category: 'attitude',
    text: 'What is the largest 12-month portfolio decline you could tolerate without abandoning your plan?',
    options: [
      { label: '0–5%', score: 1 },
      { label: '5–10%', score: 3 },
      { label: '10–20%', score: 5 },
      { label: '20–30%', score: 8 },
      { label: 'More than 30%', score: 10 },
    ],
  },
  {
    id: 'net-worth-income',
    category: 'capacity',
    text: 'Relative to your annual income, how large is your investable net worth?',
    options: [
      { label: 'Less than 1x annual income', score: 2, description: 'Limited capital buffer' },
      { label: '1x to 3x', score: 4 },
      { label: '3x to 6x', score: 6 },
      { label: '6x to 12x', score: 8 },
      { label: 'More than 12x', score: 10, description: 'Significant capital cushion' },
    ],
  },
];

export const RISK_PROFILES: RiskProfile[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Capital preservation with modest income. Suitable for short horizons or limited risk capacity.',
    scoreMin: 0,
    scoreMax: 24,
    targets: { equity: 25, debt: 55, gold: 10, realestate: 5, liquid: 5, other: 0 },
    maxEquity: 35,
    minEquity: 10,
    maxDrawdown: 8,
    targetVolatility: 6,
    riskFreeRate: 6.5,
    monteCarloSimulations: 2000,
    goalSuccessThreshold: 85,
    equityAtRetirement: 20,
    persona: 'You prioritise sleep-over-returns. Your focus is preserving capital and generating steady income.',
    recommendedApproach: 'Heavy allocation to high-quality debt and liquid assets, with a small equity sleeve for inflation protection.',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Balanced approach with limited volatility. Suitable for medium-term horizons.',
    scoreMin: 25,
    scoreMax: 39,
    targets: { equity: 40, debt: 40, gold: 10, realestate: 5, liquid: 5, other: 0 },
    maxEquity: 50,
    minEquity: 25,
    maxDrawdown: 12,
    targetVolatility: 9,
    riskFreeRate: 6.5,
    monteCarloSimulations: 2000,
    goalSuccessThreshold: 75,
    equityAtRetirement: 30,
    persona: 'You accept modest fluctuations in exchange for better long-term returns than pure debt.',
    recommendedApproach: 'Balanced equity-debt allocation with gold as a diversifier. Rebalance annually.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Growth with controlled risk. Suitable for long-term investors with stable income.',
    scoreMin: 40,
    scoreMax: 54,
    targets: { equity: 55, debt: 25, gold: 10, realestate: 5, liquid: 5, other: 0 },
    maxEquity: 65,
    minEquity: 40,
    maxDrawdown: 18,
    targetVolatility: 12,
    riskFreeRate: 6,
    monteCarloSimulations: 3000,
    goalSuccessThreshold: 70,
    equityAtRetirement: 35,
    persona: 'You are comfortable riding out market cycles for meaningful real growth.',
    recommendedApproach: 'Core equity allocation with debt and gold providing ballast. Use STPs for lumpsum deployment.',
  },
  {
    id: 'growth',
    label: 'Growth',
    description: 'Higher equity exposure for long-term wealth creation. Can tolerate significant drawdowns.',
    scoreMin: 55,
    scoreMax: 69,
    targets: { equity: 70, debt: 15, gold: 8, realestate: 4, liquid: 3, other: 0 },
    maxEquity: 80,
    minEquity: 55,
    maxDrawdown: 25,
    targetVolatility: 15,
    riskFreeRate: 6,
    monteCarloSimulations: 3000,
    goalSuccessThreshold: 65,
    equityAtRetirement: 40,
    persona: 'You think in decades, not quarters, and see market falls as opportunities.',
    recommendedApproach: 'Equity-heavy portfolio with tactical allocation and disciplined rebalancing.',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'Maximum long-term growth. Willing to accept large drawdowns and volatility.',
    scoreMin: 70,
    scoreMax: 100,
    targets: { equity: 85, debt: 5, gold: 5, realestate: 3, liquid: 2, other: 0 },
    maxEquity: 100,
    minEquity: 70,
    maxDrawdown: 40,
    targetVolatility: 20,
    riskFreeRate: 6,
    monteCarloSimulations: 5000,
    goalSuccessThreshold: 60,
    equityAtRetirement: 45,
    persona: 'You have high conviction in equity compounding and the emotional capacity to hold through severe corrections.',
    recommendedApproach: 'Concentrated equity allocation with small gold/liquid buffers. Consider alternatives opportunistically.',
  },
];

export interface RiskAnswers {
  [questionId: string]: number;
}

export function calculateRiskScore(answers: RiskAnswers): number {
  return Object.values(answers).reduce((sum, score) => sum + score, 0);
}

export function getRiskProfile(score: number): RiskProfile {
  return RISK_PROFILES.find((p) => score >= p.scoreMin && score <= p.scoreMax) || RISK_PROFILES[2];
}

export function getRiskProfileById(id: RiskProfileName): RiskProfile {
  return RISK_PROFILES.find((p) => p.id === id) || RISK_PROFILES[2];
}

export function isComplete(answers: RiskAnswers): boolean {
  return RISK_QUESTIONS.every((q) => typeof answers[q.id] === 'number');
}

export function getCategoryScores(answers: RiskAnswers): Record<string, number> {
  const totals: Record<string, { score: number; max: number }> = {};
  RISK_QUESTIONS.forEach((q) => {
    if (!totals[q.category]) totals[q.category] = { score: 0, max: 0 };
    const answer = answers[q.id] || 0;
    const maxOption = Math.max(...q.options.map((o) => o.score));
    totals[q.category].score += answer;
    totals[q.category].max += maxOption;
  });
  return Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.max > 0 ? (v.score / v.max) * 100 : 0]));
}

// Convert profile targets to record with decimals (0-1)
export function getDecimalTargets(profile: RiskProfile): Record<AssetCategory, number> {
  const total = Object.values(profile.targets).reduce((a, b) => a + b, 0);
  return {
    equity: total > 0 ? profile.targets.equity / total : 0,
    debt: total > 0 ? profile.targets.debt / total : 0,
    gold: total > 0 ? profile.targets.gold / total : 0,
    realestate: total > 0 ? profile.targets.realestate / total : 0,
    liquid: total > 0 ? profile.targets.liquid / total : 0,
    other: total > 0 ? profile.targets.other / total : 0,
  };
}

// Build glide path from current age to retirement based on risk profile
export function buildGlidePath(currentAge: number, retirementAge: number, profile: RiskProfile): { age: number; equity: number; debt: number }[] {
  const years = Math.max(0, retirementAge - currentAge);
  const startEquity = profile.targets.equity;
  const endEquity = profile.equityAtRetirement;
  const path: { age: number; equity: number; debt: number }[] = [];
  for (let y = 0; y <= years; y++) {
    const progress = years > 0 ? y / years : 0;
    const equity = startEquity - (startEquity - endEquity) * progress;
    const debt = 100 - equity;
    path.push({ age: currentAge + y, equity: Math.round(equity), debt: Math.round(debt) });
  }
  return path;
}
