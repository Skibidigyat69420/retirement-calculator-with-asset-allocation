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
  stressTestVerdict: string;
}

export type RiskDimension =
  | 'time'
  | 'tolerance'
  | 'capacity'
  | 'knowledge'
  | 'liquidity'
  | 'flexibility'
  | 'behavior'
  | 'context';

export interface RiskQuestion {
  id: string;
  dimension: RiskDimension;
  text: string;
  /** Higher is more risk-seeking / capacity / knowledge. */
  options: {
    label: string;
    score: number;
    description?: string;
  }[];
}

/**
 * Detailed risk-assessment questionnaire.
 *
 * Built from established frameworks: Grable & Lytton Risk Tolerance Scale,
 * CFA Institute risk-profiling guidance, and behavioural-finance research on
 * loss aversion, mental accounting, and recency bias. Twenty questions are
 * grouped into eight dimensions so the final profile reflects both willingness
 * (attitude/behaviour) and ability (capacity/time/liquidity/context) to take
 * risk, and so advisers can spot gaps between the two.
 */
export const RISK_QUESTIONS: RiskQuestion[] = [
  // === Time Horizon (12%) ===
  {
    id: 'time-horizon-main',
    dimension: 'time',
    text: 'When do you expect to need a meaningful portion of this portfolio?',
    options: [
      { label: 'Within 2 years', score: 1, description: 'Capital preservation is critical' },
      { label: '2 to 5 years', score: 3, description: 'Short-term goals dominate' },
      { label: '5 to 10 years', score: 5, description: 'Medium-term horizon' },
      { label: '10 to 20 years', score: 8, description: 'Long-term wealth building' },
      { label: 'More than 20 years', score: 10, description: 'Multi-decade compounding horizon' },
    ],
  },
  {
    id: 'time-horizon-retirement',
    dimension: 'time',
    text: 'How many years are you from your intended retirement or financial independence date?',
    options: [
      { label: 'Already retired / within 3 years', score: 1 },
      { label: '3 to 7 years', score: 3 },
      { label: '7 to 15 years', score: 5 },
      { label: '15 to 25 years', score: 8 },
      { label: 'More than 25 years', score: 10 },
    ],
  },
  {
    id: 'time-liquidity-milestone',
    dimension: 'time',
    text: 'Do you have major capital withdrawals planned within the next 3 to 7 years (e.g., higher education, property purchase, business equity)?',
    options: [
      { label: 'Definite major withdrawal within 1–2 years', score: 1, description: 'High near-term liquidity constraint' },
      { label: 'Probable major withdrawal in 2–4 years', score: 3 },
      { label: 'Possible withdrawal in 4–7 years', score: 5 },
      { label: 'Unlikely / minimal capital withdrawals planned', score: 8 },
      { label: 'No capital withdrawals planned for at least 7–10 years', score: 10, description: 'Unencumbered compounding horizon' },
    ],
  },
  {
    id: 'time-wealth-legacy',
    dimension: 'time',
    text: 'What is your intended horizon for wealth transfer and legacy beyond personal retirement living expenses?',
    options: [
      { label: 'Portfolio must be fully consumed during my lifetime', score: 1, description: 'Pure decumulation mandate' },
      { label: 'Plan to leave a modest residual cushion for heirs', score: 3 },
      { label: 'Aim to preserve roughly 30–50% of real corpus for legacy', score: 6 },
      { label: 'Aim to preserve and pass on the majority of the wealth', score: 8 },
      { label: 'Multi-generational dynasty endowment (horizon extends decades beyond lifetime)', score: 10, description: 'Perpetual horizon' },
    ],
  },

  // === Risk Tolerance / Attitude (20%) ===
  {
    id: 'loss-reaction',
    dimension: 'tolerance',
    text: 'If your portfolio fell 20% in a market correction, what would you most likely do?',
    options: [
      { label: 'Sell everything immediately to avoid further losses', score: 1 },
      { label: 'Sell a portion and move to safer assets', score: 3 },
      { label: 'Hold and wait for recovery', score: 6 },
      { label: 'Buy more if the investment case is still intact', score: 9 },
      { label: 'Aggressively add more equity at lower prices', score: 10 },
    ],
  },
  {
    id: 'drawdown-tolerance',
    dimension: 'tolerance',
    text: 'What is the largest 12-month portfolio decline you could tolerate without abandoning your plan?',
    options: [
      { label: '0–5%', score: 1 },
      { label: '5–10%', score: 3 },
      { label: '10–20%', score: 5 },
      { label: '20–35%', score: 8 },
      { label: 'More than 35%', score: 10 },
    ],
  },
  {
    id: 'volatility-sleep',
    dimension: 'tolerance',
    text: 'How much short-term volatility are you comfortable accepting in exchange for higher long-term returns?',
    options: [
      { label: 'Almost none — stable values are essential', score: 1 },
      { label: 'Small fluctuations are acceptable', score: 3 },
      { label: 'Moderate ups and downs are fine', score: 5 },
      { label: 'Significant swings for better growth', score: 8 },
      { label: 'High volatility is the price of compounding', score: 10 },
    ],
  },
  {
    id: 'unrealized-loss-anxiety',
    dimension: 'tolerance',
    text: 'When your portfolio shows an unrealized (paper) loss below your invested capital, how does it affect your mindset?',
    options: [
      { label: 'Causes severe stress; I obsess over it and want to exit', score: 1, description: 'Extreme loss aversion' },
      { label: 'Makes me anxious and question my asset allocation', score: 3 },
      { label: 'Noticeable discomfort, but I stay committed to the plan', score: 5 },
      { label: 'Minor nuisance; I recognize paper losses as normal cycle dynamics', score: 8 },
      { label: 'Completely unbothered; paper drawdowns create bargain buying opportunities', score: 10, description: 'Contrarian conviction' },
    ],
  },
  {
    id: 'illiquidity-premium',
    dimension: 'tolerance',
    text: 'Would you commit a portion of your portfolio to higher-yielding locked/illiquid investments (e.g. private credit, lock-in funds, real estate) for 3–5 years without early exit options?',
    options: [
      { label: 'Absolutely not; daily redemption liquidity is mandatory', score: 1 },
      { label: 'Only a very small portion (< 10%)', score: 3 },
      { label: 'Willing to allocate 10–25% if return premium is 3–4% p.a.', score: 6 },
      { label: 'Comfortable locking 25–40% for superior illiquidity alpha', score: 8 },
      { label: 'Very comfortable locking a majority of long-term capital', score: 10 },
    ],
  },

  // === Risk Capacity (18%) ===
  {
    id: 'income-stability',
    dimension: 'capacity',
    text: 'How stable is your primary income / cash flow?',
    options: [
      { label: 'Very unstable / seasonal', score: 1, description: 'Irregular freelance, commission, or early-stage business' },
      { label: 'Somewhat unstable', score: 3, description: 'Variable but within a predictable range' },
      { label: 'Stable with moderate growth', score: 5, description: 'Salaried with annual increments' },
      { label: 'Very stable', score: 7, description: 'Tenured, government, or recession-resistant' },
      { label: 'Stable and growing rapidly', score: 10, description: 'High-growth career or business with strong visibility' },
    ],
  },
  {
    id: 'net-worth-income',
    dimension: 'capacity',
    text: 'Relative to your annual gross income, how large is your investable net worth?',
    options: [
      { label: 'Less than 1x annual income', score: 1, description: 'Limited capital buffer' },
      { label: '1x to 3x', score: 3 },
      { label: '3x to 6x', score: 5 },
      { label: '6x to 12x', score: 8 },
      { label: 'More than 12x', score: 10, description: 'Significant capital cushion' },
    ],
  },
  {
    id: 'future-income',
    dimension: 'capacity',
    text: 'Do you expect large future liabilities or cash outflows (education, property, business investment) in the next 5 years?',
    options: [
      { label: 'Several certain large outflows', score: 1 },
      { label: 'One or two likely large outflows', score: 3 },
      { label: 'Some possible outflows', score: 5 },
      { label: 'Few planned outflows', score: 8 },
      { label: 'No material planned outflows', score: 10 },
    ],
  },
  {
    id: 'income-replacement-resilience',
    dimension: 'capacity',
    text: 'If your primary earning stream ceased abruptly, how long could your household maintain its lifestyle without selling long-term investments?',
    options: [
      { label: 'Less than 3 months', score: 1, description: 'Severe financial fragility' },
      { label: '3 to 6 months', score: 3 },
      { label: '6 to 12 months', score: 5 },
      { label: '1 to 2 years from external savings/cash buffers', score: 8 },
      { label: 'More than 2 years / covered by passive income & rentals', score: 10, description: 'Robust independent cashflow resilience' },
    ],
  },

  // === Financial Knowledge & Experience (10%) ===
  {
    id: 'experience',
    dimension: 'knowledge',
    text: 'How much experience do you have with volatile investments such as equity, equity funds, or alternatives?',
    options: [
      { label: 'None', score: 1 },
      { label: 'Limited — mostly FDs, debt funds, or savings products', score: 3 },
      { label: 'Some — occasional equity or balanced funds', score: 5 },
      { label: 'Experienced — direct equity, ETFs, and market cycles', score: 8 },
      { label: 'Professional / very experienced', score: 10 },
    ],
  },
  {
    id: 'understanding-risk',
    dimension: 'knowledge',
    text: 'Which statement best describes your understanding of risk and return?',
    options: [
      { label: 'I believe capital should never lose value', score: 1 },
      { label: 'I understand safer assets give lower returns', score: 3 },
      { label: 'I accept that equity can be volatile but tends to outperform over time', score: 5 },
      { label: 'I understand correlation, diversification, and drawdowns', score: 8 },
      { label: 'I actively think about skew, tail risk, and sequence-of-returns risk', score: 10 },
    ],
  },
  {
    id: 'market-cycle-experience',
    dimension: 'knowledge',
    text: 'Which historical market downturns have you actively invested personal capital through?',
    options: [
      { label: 'None / invested only in the recent bull market (< 2 years)', score: 1 },
      { label: 'Post-2020 COVID recovery phase only', score: 3 },
      { label: 'Experienced the 2018–2019 midcap correction or 2020 crash', score: 6 },
      { label: 'Invested through the 2008 Global Financial Crisis', score: 8 },
      { label: 'Invested through multiple multi-year bear cycles (e.g. 2000 Dotcom & 2008 GFC)', score: 10, description: 'Seasoned market veteran' },
    ],
  },
  {
    id: 'inflation-purchasing-power',
    dimension: 'knowledge',
    text: 'How do you view the trade-off between guaranteed bank fixed deposits and volatile equity over 10+ years?',
    options: [
      { label: 'Guaranteed capital is paramount, even if after-tax real purchasing power declines', score: 1 },
      { label: 'Prefer mostly guaranteed assets with a small token growth sleeve', score: 3 },
      { label: 'Recognize that pure debt guarantees a long-term erosion of purchasing power', score: 6 },
      { label: 'Strongly prioritize real inflation-adjusted wealth compounding over nominal stability', score: 10 },
    ],
  },

  // === Liquidity & Safety Net (10%) ===
  {
    id: 'liquidity-buffer',
    dimension: 'liquidity',
    text: 'How much of your total portfolio must remain easily accessible (liquid) at all times?',
    options: [
      { label: 'More than 40%', score: 1, description: 'High liquidity need' },
      { label: '25% to 40%', score: 3 },
      { label: '15% to 25%', score: 5 },
      { label: '5% to 15%', score: 8 },
      { label: 'Less than 5%', score: 10, description: 'Long-term capital; liquidity handled elsewhere' },
    ],
  },
  {
    id: 'emergency-fund',
    dimension: 'liquidity',
    text: 'Do you have a separate emergency fund covering at least 6 months of expenses outside this portfolio?',
    options: [
      { label: 'No emergency fund', score: 1 },
      { label: 'Less than 3 months', score: 3 },
      { label: '3 to 6 months', score: 5 },
      { label: '6 to 12 months', score: 8 },
      { label: 'More than 12 months', score: 10 },
    ],
  },
  {
    id: 'credit-access-buffer',
    dimension: 'liquidity',
    text: 'Do you have access to low-cost standby liquidity or borrowing lines (e.g. loan against securities/FD, overdraft) if an emergency occurs?',
    options: [
      { label: 'No credit facilities; any emergency forces selling portfolio assets', score: 1 },
      { label: 'Only high-cost credit cards or unsecured personal loans', score: 3 },
      { label: 'Moderate personal credit facilities or family backup', score: 6 },
      { label: 'Pre-approved loan-against-mutual-funds/securities with low interest rates', score: 8 },
      { label: 'Extensive prime credit lines and liquid business facilities', score: 10 },
    ],
  },

  // === Goal Flexibility (8%) ===
  {
    id: 'goals-essential',
    dimension: 'flexibility',
    text: 'What portion of your goals are essential (must be met) versus aspirational?',
    options: [
      { label: 'Almost all essential', score: 1, description: 'Little room for risk' },
      { label: 'More essential than aspirational', score: 3 },
      { label: 'Balanced mix', score: 6 },
      { label: 'More aspirational than essential', score: 8 },
      { label: 'Mostly aspirational or legacy', score: 10 },
    ],
  },
  {
    id: 'goal-timing-flexibility',
    dimension: 'flexibility',
    text: 'If markets performed poorly, how flexible are you on the timing of your goals?',
    options: [
      { label: 'No flexibility — dates are fixed', score: 1 },
      { label: 'Minor delays possible', score: 3 },
      { label: 'Some goals can be postponed 1–2 years', score: 5 },
      { label: 'Most goals can shift by several years', score: 8 },
      { label: 'Timing is entirely flexible', score: 10 },
    ],
  },
  {
    id: 'lifestyle-expenditure-flexibility',
    dimension: 'flexibility',
    text: 'During prolonged economic distress or bear markets, how easily could your household reduce discretionary expenditures?',
    options: [
      { label: 'Virtually impossible; all costs are fixed commitments and debt service', score: 1 },
      { label: 'Can trim spending by 5–10% with considerable sacrifice', score: 3 },
      { label: 'Can comfortably cut 15–25% of discretionary lifestyle spending', score: 6 },
      { label: 'Highly adaptable; can scale back 30–50% of annual outflows if needed', score: 10 },
    ],
  },

  // === Behavioural Stability (10%) ===
  {
    id: 'past-behavior',
    dimension: 'behavior',
    text: 'During a previous major market decline, what did you actually do?',
    options: [
      { label: 'Sold investments and stayed out for a long time', score: 1 },
      { label: 'Sold some investments', score: 3 },
      { label: 'Did nothing', score: 5 },
      { label: 'Held and eventually added', score: 8 },
      { label: 'I have not invested through a major decline / not applicable', score: 5 },
    ],
  },
  {
    id: 'regret-aversion',
    dimension: 'behavior',
    text: 'Which would bother you more: missing a market rally, or losing money in a downturn?',
    options: [
      { label: 'Losing money is far worse under any circumstance', score: 1 },
      { label: 'Losing money is somewhat worse', score: 3 },
      { label: 'Both bother me equally', score: 5 },
      { label: 'Missing a rally is somewhat worse', score: 8 },
      { label: 'Missing a rally is far worse', score: 10 },
    ],
  },
  {
    id: 'monitoring-frequency',
    dimension: 'behavior',
    text: 'How often do you check your portfolio value?',
    options: [
      { label: 'Multiple times a day', score: 1, description: 'Likely to overreact to noise' },
      { label: 'Daily', score: 3 },
      { label: 'Weekly', score: 5 },
      { label: 'Monthly or quarterly', score: 8 },
      { label: 'Only when reviewing with my adviser', score: 10 },
    ],
  },
  {
    id: 'peer-market-noise-reaction',
    dimension: 'behavior',
    text: 'When peers, social media, or news headlines aggressively promote hot speculative trends (e.g. crypto, trendy IPOs, micro-caps), how do you react?',
    options: [
      { label: 'Intense FOMO; I frequently reallocate capital into the trending assets', score: 1, description: 'High trend-chasing bias' },
      { label: 'Tempted and occasionally make speculative allocations', score: 3 },
      { label: 'Curious, but evaluate calmly against long-term risk parameters', score: 6 },
      { label: 'Completely disciplined; adhere strictly to core asset allocation policy', score: 10, description: 'High emotional discipline' },
    ],
  },

  // === Portfolio Context, Concentration & Family (12%) ===
  {
    id: 'portfolio-concentration',
    dimension: 'context',
    text: 'How concentrated is your overall wealth in one asset, business, or employer?',
    options: [
      { label: 'Most wealth depends on one stock, business, or job', score: 1, description: 'High concentration risk' },
      { label: 'Significant exposure to one source', score: 3 },
      { label: 'Moderately diversified', score: 5 },
      { label: 'Well diversified across asset classes', score: 8 },
      { label: 'Very diversified across assets, geographies, and income sources', score: 10 },
    ],
  },
  {
    id: 'insurance-safety-net',
    dimension: 'context',
    text: 'How protected are you against large unexpected shocks (health, liability, property, disability)?',
    options: [
      { label: 'No meaningful insurance cover', score: 1 },
      { label: 'Basic cover only', score: 3 },
      { label: 'Adequate standard cover', score: 5 },
      { label: 'Comprehensive cover with contingencies', score: 8 },
      { label: 'Fully insured with umbrella / excess cover', score: 10 },
    ],
  },
  {
    id: 'dependents-obligations',
    dimension: 'context',
    text: 'How many people depend on your income or financial support?',
    options: [
      { label: 'Many dependents with limited support network', score: 1 },
      { label: 'Several dependents', score: 3 },
      { label: 'A few dependents', score: 5 },
      { label: 'One dependent or shared support', score: 8 },
      { label: 'No dependents / fully independent', score: 10 },
    ],
  },
  {
    id: 'family-alignment-consensus',
    dimension: 'context',
    text: 'If managing family or joint household wealth, how aligned are you and key stakeholders/partner on investment risk and drawdowns?',
    options: [
      { label: 'High friction / partner has drastically lower risk tolerance and panics in drops', score: 1, description: 'Significant household risk discord' },
      { label: 'Moderate disagreement on volatility and major capital decisions', score: 3 },
      { label: 'Generally aligned with mutual consultation', score: 6 },
      { label: 'Complete alignment on long-term strategy, drawdown acceptance, and goals', score: 10, description: 'Unified advisory mandate' },
    ],
  },
];

/** Dimension weights — willingness and ability are both required. */
export const DIMENSION_WEIGHTS: Record<RiskDimension, number> = {
  time: 0.12,
  tolerance: 0.20,
  capacity: 0.18,
  knowledge: 0.10,
  liquidity: 0.10,
  flexibility: 0.08,
  behavior: 0.10,
  context: 0.12,
};

export const RISK_PROFILES: RiskProfile[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    description: 'Capital preservation with modest income. Suitable for short horizons, limited risk capacity, or investors who cannot tolerate meaningful drawdowns.',
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
    persona: 'You prioritise sleep-over-returns. Your focus is preserving capital, generating steady income, and avoiding permanent loss.',
    recommendedApproach: 'Heavy allocation to high-quality debt and liquid assets, with a small equity sleeve for inflation protection. Prefer SIPs over lumpsum equity deployment.',
    stressTestVerdict: 'A 2008-style 30–40% equity drawdown would likely be unacceptable. Keep equity exposure low and use gold/debt as ballast.',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Balanced approach with limited volatility. Suitable for medium-term horizons and investors who accept modest fluctuations for better long-term returns.',
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
    persona: 'You accept modest fluctuations in exchange for better long-term returns than pure debt, but large drawdowns make you uncomfortable.',
    recommendedApproach: 'Balanced equity-debt allocation with gold as a diversifier. Rebalance annually and use STPs for lumpsum deployment.',
    stressTestVerdict: 'You can tolerate a 10–15% portfolio decline but should avoid aggressive equity concentrations.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Growth with controlled risk. Suitable for long-term investors with stable income and the ability to ride out market cycles.',
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
    persona: 'You are comfortable riding out market cycles for meaningful real growth, provided the plan stays broadly on track.',
    recommendedApproach: 'Core equity allocation with debt and gold providing ballast. Use STPs for lumpsum deployment and rebalance when drift exceeds 5%.',
    stressTestVerdict: 'A 20% portfolio decline is uncomfortable but manageable. Stay diversified and avoid panic selling.',
  },
  {
    id: 'growth',
    label: 'Growth',
    description: 'Higher equity exposure for long-term wealth creation. Can tolerate significant drawdowns and short-term underperformance.',
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
    persona: 'You think in decades, not quarters, and see market falls as opportunities to add to growth assets.',
    recommendedApproach: 'Equity-heavy portfolio with tactical allocation around extremes and disciplined rebalancing. Keep a small liquid reserve for opportunistic buying.',
    stressTestVerdict: 'You can withstand a 25–30% drawdown as long as the long-term thesis remains intact.',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    description: 'Maximum long-term growth. Willing to accept large drawdowns and high volatility in pursuit of superior compounding.',
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
    persona: 'You have high conviction in equity compounding and the emotional capacity to hold through severe corrections without changing course.',
    recommendedApproach: 'Concentrated equity allocation with small gold/liquid buffers. Consider alternatives opportunistically and rebalance tactically.',
    stressTestVerdict: 'You can emotionally and financially absorb a 35–45% drawdown. Maintain liquidity so you are not forced to sell at the bottom.',
  },
];

export interface RiskAnswers {
  [questionId: string]: number;
}

export interface DimensionScore {
  score: number;
  max: number;
  percentage: number;
  weight: number;
  weightedContribution: number;
}

function getDimensionScores(answers: RiskAnswers): Record<RiskDimension, DimensionScore> {
  const totals: Record<RiskDimension, { score: number; max: number }> = {
    time: { score: 0, max: 0 },
    tolerance: { score: 0, max: 0 },
    capacity: { score: 0, max: 0 },
    knowledge: { score: 0, max: 0 },
    liquidity: { score: 0, max: 0 },
    flexibility: { score: 0, max: 0 },
    behavior: { score: 0, max: 0 },
    context: { score: 0, max: 0 },
  };

  RISK_QUESTIONS.forEach((q) => {
    const answer = answers[q.id] || 0;
    const maxOption = Math.max(...q.options.map((o) => o.score));
    totals[q.dimension].score += answer;
    totals[q.dimension].max += maxOption;
  });

  return Object.fromEntries(
    (Object.keys(totals) as RiskDimension[]).map((dim) => {
      const t = totals[dim];
      const percentage = t.max > 0 ? (t.score / t.max) * 100 : 0;
      const weight = DIMENSION_WEIGHTS[dim];
      return [
        dim,
        {
          score: t.score,
          max: t.max,
          percentage: Math.round(percentage * 10) / 10,
          weight,
          weightedContribution: Math.round(percentage * weight * 10) / 10,
        },
      ];
    }),
  ) as Record<RiskDimension, DimensionScore>;
}

/**
 * Weighted composite risk score (0–100).
 */
export function calculateRiskScore(answers: RiskAnswers): number {
  const dimensions = getDimensionScores(answers);
  const weighted = Object.values(dimensions).reduce((sum, d) => sum + d.weightedContribution, 0);
  return Math.round(weighted);
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
  const dimensions = getDimensionScores(answers);
  return Object.fromEntries(
    Object.entries(dimensions).map(([dim, data]) => [dim, data.percentage]),
  );
}

export function getDimensionBreakdown(answers: RiskAnswers): Record<RiskDimension, DimensionScore> {
  return getDimensionScores(answers);
}

export interface RiskGapAnalysis {
  tolerancePct: number;
  capacityPct: number;
  gap: number; // positive = tolerance > capacity
  verdict: string;
}

export function analyzeRiskGap(answers: RiskAnswers): RiskGapAnalysis {
  const dims = getDimensionScores(answers);
  const tolerancePct = dims.tolerance.percentage;
  const capacityPct = dims.capacity.percentage;
  const gap = tolerancePct - capacityPct;

  let verdict: string;
  if (gap > 20) {
    verdict = 'Your willingness to take risk exceeds your financial capacity. The plan should use the lower capacity score to size equity exposure, or you should build a larger safety buffer before increasing risk.';
  } else if (gap < -20) {
    verdict = 'Your financial capacity is higher than your comfort with risk. You can afford more risk, but only take it if you are emotionally prepared; otherwise the plan may be abandoned in a downturn.';
  } else {
    verdict = 'Your risk tolerance and risk capacity are reasonably aligned. The recommended profile reflects both.';
  }

  return { tolerancePct, capacityPct, gap, verdict };
}

export interface BehavioralBias {
  bias: string;
  level: 'low' | 'moderate' | 'high';
  description: string;
  suggestion: string;
}

export function detectBehavioralBiases(answers: RiskAnswers): BehavioralBias[] {
  const biases: BehavioralBias[] = [];

  const lossReaction = answers['loss-reaction'] || 0;
  const regret = answers['regret-aversion'] || 0;
  const monitoring = answers['monitoring-frequency'] || 0;
  const drawdown = answers['drawdown-tolerance'] || 0;
  const pastBehavior = answers['past-behavior'] || 0;
  const experience = answers['experience'] || 0;
  const knowledge = answers['understanding-risk'] || 0;
  const unrealizedLoss = answers['unrealized-loss-anxiety'] || 0;
  const peerNoise = answers['peer-market-noise-reaction'] || 0;
  const inflationUnderstanding = answers['inflation-purchasing-power'] || 0;
  const familyAlignment = answers['family-alignment-consensus'] || 0;
  const illiquidity = answers['illiquidity-premium'] || 0;
  const liquidityBuffer = answers['liquidity-buffer'] || 0;

  // Loss aversion: high regret of losses + low drawdown tolerance or high unrealized loss anxiety
  if ((regret <= 3 && drawdown <= 4) || unrealizedLoss <= 3) {
    biases.push({
      bias: 'Loss Aversion & Paper Loss Myopia',
      level: 'high',
      description: 'You feel paper drops much more acutely than equivalent gains, creating urge to capitulate near cycle bottoms.',
      suggestion: 'Keep equity exposure at the lower end of your profile range and maintain substantial debt/gold ballast.',
    });
  }

  // Overconfidence: high knowledge/experience + aggressive past behaviour but low monitoring
  if (experience >= 8 && knowledge >= 8 && monitoring <= 3) {
    biases.push({
      bias: 'Overconfidence / Over-monitoring',
      level: 'moderate',
      description: 'High confidence combined with frequent checking can lead to reactive trading and portfolio churn.',
      suggestion: 'Set a quarterly review calendar and pre-commit to systematic rebalancing rules before market swings.',
    });
  }

  // Panic selling risk: past behavior shows selling + low tolerance
  if (pastBehavior <= 3 && lossReaction <= 3) {
    biases.push({
      bias: 'Panic-selling Tendency',
      level: 'high',
      description: 'Historical tendency to liquidate growth assets during sharp corrections.',
      suggestion: 'Automate SIPs/STPs and strictly formalize your written Investment Policy Statement (IPS) before drawdowns hit.',
    });
  }

  // Noise sensitivity: checks very frequently
  if (monitoring <= 3) {
    biases.push({
      bias: 'Noise Sensitivity',
      level: 'high',
      description: 'Frequent portfolio checks transform short-term daily volatility into acute emotional stress.',
      suggestion: 'Limit portfolio checks to monthly or quarterly reviews; disable push price notifications.',
    });
  }

  // Trend chasing & FOMO
  if (peerNoise <= 3) {
    biases.push({
      bias: 'Trend-Chasing & FOMO Bias',
      level: 'high',
      description: 'Vulnerable to allocating capital into hyped or overextended market rallies out of regret aversion.',
      suggestion: 'Maintain a strict rule: any new asset class requires a 7-day cooling-off period and advisor review.',
    });
  }

  // Inflation illusion
  if (inflationUnderstanding <= 3) {
    biases.push({
      bias: 'Inflation Illusion / Real Return Neglect',
      level: 'moderate',
      description: 'Viewing fixed deposits as risk-free ignores the silent purchasing power destruction caused by inflation and taxes.',
      suggestion: 'Focus on inflation-adjusted (real) wealth trajectories rather than nominal deposit guarantees.',
    });
  }

  // Household / Family alignment friction
  if (familyAlignment <= 3 && familyAlignment > 0) {
    biases.push({
      bias: 'Household Risk Discord',
      level: 'high',
      description: 'Divergent risk tolerances between household co-decision makers can lead to conflict during bear markets.',
      suggestion: 'Conduct a joint IPS alignment session to agree on an asset allocation both partners can comfortably sleep with.',
    });
  }

  // Illiquidity trap
  if (illiquidity >= 8 && liquidityBuffer <= 3 && liquidityBuffer > 0) {
    biases.push({
      bias: 'Illiquidity Mismatch',
      level: 'moderate',
      description: 'Eagerness to harvest illiquidity premia while holding thin liquid reserves risks forced selling of liquid assets.',
      suggestion: 'Build a full 12-month liquid reserve before allocating capital into locked or private market investments.',
    });
  }

  // Action bias: wants to do something in declines but also fears them
  if (lossReaction >= 8 && drawdown <= 5) {
    biases.push({
      bias: 'Action Bias vs Safety Preference',
      level: 'moderate',
      description: 'You want to buy dips but also have low drawdown tolerance — a conflict that can cause whipsawing.',
      suggestion: 'Use a rules-based STP and keep a small "opportunistic" sleeve separate from core assets.',
    });
  }

  return biases;
}

export function generateActionChecklist(profile: RiskProfile, gap: RiskGapAnalysis, biases: BehavioralBias[]): string[] {
  const actions: string[] = [];

  actions.push(`Set strategic allocation to ${profile.label.toLowerCase()} targets: ${profile.targets.equity}% equity, ${profile.targets.debt}% debt, ${profile.targets.gold}% gold.`);
  actions.push(`Limit equity exposure to ${profile.maxEquity}% and expect a maximum drawdown around ${profile.maxDrawdown}%.`);
  actions.push(`Require at least ${profile.goalSuccessThreshold}% probability of success before marking goals as on track.`);

  if (gap.gap > 20) {
    actions.push('Build a larger emergency fund and safety net before raising equity above capacity.');
  } else if (gap.gap < -20) {
    actions.push('Revisit the questionnaire in 6–12 months; if comfort rises, consider a gradual equity step-up.');
  }

  if (biases.some((b) => b.bias === 'Panic-selling Tendency')) {
    actions.push('Automate SIPs and write down a rebalancing policy now to avoid emotion-driven selling later.');
  }

  if (biases.some((b) => b.bias === 'Noise Sensitivity')) {
    actions.push('Reduce portfolio-checking frequency to monthly or quarterly.');
  }

  if (profile.id === 'conservative' || profile.id === 'moderate') {
    actions.push('Prioritise debt and gold for stability; use equity only for long-dated goals.');
  }

  if (profile.id === 'growth' || profile.id === 'aggressive') {
    actions.push('Maintain 6–12 months of liquidity so you are never forced to sell equities in a downturn.');
  }

  return actions;
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
