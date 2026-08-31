export type AssetCategory = 'equity' | 'debt' | 'gold' | 'realestate' | 'liquid' | 'other';

export interface Asset {
  id: string;
  name: string;
  value: number;
  returnRate: number;
  category: AssetCategory;
  currency: string; // e.g. INR, USD
  liquidateAtRetirement: boolean;
}

export interface SIPConfig {
  amount: number;
  equitySplit: number;
  debtSplit: number;
  stepUp: number;
  equityReturn: number;
  debtReturn: number;
}

export interface STPConfig {
  active: boolean;
  source: 'idle-cash' | 'land-sale' | 'custom';
  lumpsum: number;
  monthlyTransfer: number;
  liquidReturn: number;
  equitySplit: number;
  debtSplit: number;
  liquidCap: number;
}

export interface SWPConfig {
  monthlyNeedToday: number;
  postRetirementReturn: number;
  taxRate: number;
  startAge: number;
  endAge: number;
}

export type GoalPriority = 'essential' | 'important' | 'aspirational';
export type RiskProfileName = 'conservative' | 'moderate' | 'balanced' | 'growth' | 'aggressive';

export interface RiskProfile {
  id: RiskProfileName;
  label: string;
  description: string;
  scoreMin: number;
  scoreMax: number;
  targets: Record<AssetCategory, number>;
  maxEquity: number;
  minEquity: number;
  maxDrawdown: number;
  targetVolatility: number;
  riskFreeRate: number;
  monteCarloSimulations: number;
  goalSuccessThreshold: number;
  equityAtRetirement: number;
  persona: string;
  recommendedApproach: string;
  stressTestVerdict: string;
}

export interface RiskQuestion {
  id: string;
  category: 'time' | 'capacity' | 'attitude' | 'experience' | 'liquidity' | 'goals';
  text: string;
  options: { label: string; score: number; description?: string }[];
}

export interface RiskAnswers {
  [questionId: string]: number;
}

export interface GoalProbabilityBin {
  binStart: number;
  binEnd: number;
  count: number;
  probability: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  yearsToGoal: number;
  priority: GoalPriority;
  inflation: number;
  recurring: boolean;
  // Computed fields
  futureValue?: number;
  pvNeeded?: number;
  successRate?: number;
  requiredSIP?: number;
  probabilityDistribution?: GoalProbabilityBin[];
}

export interface MasterPlanInputs {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  inflation: number;
  annualIncome: number;
  monthlyExpenditure: number;
  assets: Asset[];
  sip: SIPConfig;
  stp: STPConfig;
  swp: SWPConfig;
  goals: Goal[];
}

export interface YearlySnapshot {
  year: number;
  age: number;
  equity: number;
  debt: number;
  gold: number;
  realEstate: number;
  liquid: number;
  other: number;
  nominal: number;
  real: number;
  totalInvested?: number;
  monthlyNeed?: number;
  annualWithdrawal?: number;
  corpusLeft?: number;
  phase: 'accumulation' | 'distribution';
}

export interface AllocationItem {
  category: AssetCategory;
  value: number;
  target: number;
}

export interface MasterPlanResult {
  snapshots: YearlySnapshot[];
  terminalCorpusNominal: number;
  terminalCorpusReal: number;
  cagrNominal: number;
  cagrReal: number;
  depletionAge: number | null;
  sustainable: boolean;
  totalInvested: number;
  monthlyNeedAtRetirement: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  inputs: MasterPlanInputs;
}

export interface MonteCarloConfig {
  simulations: number;
  equityReturnMean: number;
  equityReturnStd: number;
  debtReturnMean: number;
  debtReturnStd: number;
  goldReturnMean: number;
  goldReturnStd: number;
  realEstateReturnMean: number;
  realEstateReturnStd: number;
  liquidReturnMean: number;
  liquidReturnStd: number;
  postRetirementReturnMean: number;
  postRetirementReturnStd: number;
  seed?: number;
}

export interface MonteCarloRun {
  config: MonteCarloConfig;
  successRate: number;
  medianTerminalCorpus: number;
  meanTerminalCorpus: number;
  percentile5: number;
  percentile25: number;
  percentile75: number;
  percentile95: number;
  medianDepletionAge: number | null;
  outcomes: MonteCarloOutcome[];
  yearlyPercentiles: MonteCarloYearlyPercentile[];
}

export interface MonteCarloOutcome {
  terminalCorpus: number;
  depletionAge: number | null;
  sustainable: boolean;
  finalMonthlyNeed: number;
}

export interface MonteCarloYearlyPercentile {
  year: number;
  age: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

// Live market data feed
export interface LiveTick {
  token: string;
  symbol: string;
  exchange: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
  bid?: number;
  ask?: number;
}

// Portfolio analytics
export interface PortfolioHoldingAnalytics {
  symbol: string;
  token: string;
  exchange: string;
  quantity: number;
  avgPrice: number;
  ltp: number;
  value: number;
  invested: number;
  pnl: number;
  pnlPercent: number;
  weight: number;
  category: AssetCategory;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  totalPnlPercent: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  var95: number;
  cvar95: number;
  correlationToBenchmark: number;
}

// Advanced allocation models
export interface AllocationModelResult {
  model: 'black-litterman' | 'risk-parity' | 'glide-path' | 'tactical';
  weights: Record<AssetCategory, number>;
  expectedReturn: number;
  volatility: number;
  sharpe: number;
  riskContributions?: Record<AssetCategory, number>;
  tacticalSignals?: Record<AssetCategory, number>;
  glidePath?: { age: number; equity: number; debt: number }[];
}

export interface BlackLittermanView {
  asset: AssetCategory;
  return: number;
  confidence: number;
}

// Implementation shortfall / trade analytics
export interface TradeExecution {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  benchmarkPrice: number;
  avgExecutionPrice: number;
  arrivalPrice: number;
  vwap: number;
  twap: number;
  explicitCost: number; // brokerage + taxes + fees
  startTime: string;
  endTime: string;
  marketValue: number;
}

export interface ImplementationShortfallResult {
  arrivalShortfall: number;
  arrivalShortfallBps: number;
  vwapSlippage: number;
  vwapSlippageBps: number;
  twapSlippage: number;
  twapSlippageBps: number;
  marketImpact: number;
  timingCost: number;
  explicitCost: number;
  totalCost: number;
  totalCostBps: number;
}

export interface PreTradeEstimate {
  expectedShortfallBps: number;
  marketImpactBps: number;
  timingRiskBps: number;
  participationRate: number;
  recommendedDurationHours: number;
}

// SWR / sequence risk
export interface SWRResult {
  withdrawalRate: number;
  successRate: number;
  medianEndingCorpus: number;
  worstEndingCorpus: number;
}

export interface SequenceRiskResult {
  baseSustainable: boolean;
  baseDepletionAge: number | null;
  stressedSustainable: boolean;
  stressedDepletionAge: number | null;
  scenarios: { year: number; age: number; baseCorpus: number; stressedCorpus: number }[];
}

// Tax-loss harvesting
export interface TaxLossHarvestOpportunity {
  symbol: string;
  quantity: number;
  avgPrice: number;
  ltp: number;
  unrealizedLoss: number;
  harvestableLoss: number;
  taxAlpha: number;
}
