export type AssetCategory = 'equity' | 'debt' | 'gold' | 'realestate' | 'liquid' | 'other';

export interface Asset {
  id: string;
  name: string;
  value: number;
  returnRate: number;
  category: AssetCategory;
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

export interface MasterPlanInputs {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  inflation: number;
  assets: Asset[];
  sip: SIPConfig;
  stp: STPConfig;
  swp: SWPConfig;
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
