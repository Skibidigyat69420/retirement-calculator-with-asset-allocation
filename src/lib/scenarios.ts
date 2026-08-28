import type { MasterPlanInputs, Scenario } from '../types';
import { DEFAULT_RATES, DEFAULT_ALLOCATION } from './constants';

export const defaultClientInputs = (): MasterPlanInputs => ({
  currentAge: 34,
  retirementAge: 45,
  lifeExpectancy: 80,
  inflation: DEFAULT_RATES.inflation,
  assets: [
    {
      id: 're-plots',
      name: 'Real Estate — Plots',
      value: 11200000,
      returnRate: DEFAULT_RATES.realEstateReturn,
      category: 'realestate',
      liquidateAtRetirement: false,
    },
    {
      id: 'gold-physical',
      name: 'Gold — Physical',
      value: 5000000,
      returnRate: DEFAULT_RATES.goldReturn,
      category: 'gold',
      liquidateAtRetirement: false,
    },
    {
      id: 'liquid-cash',
      name: 'Liquid — Cash',
      value: 3500000,
      returnRate: DEFAULT_RATES.liquidReturn,
      category: 'liquid',
      liquidateAtRetirement: true,
    },
    {
      id: 're-flat',
      name: 'Real Estate — Flat',
      value: 2500000,
      returnRate: DEFAULT_RATES.realEstateReturn,
      category: 'realestate',
      liquidateAtRetirement: false,
    },
    {
      id: 'mf-equity',
      name: 'Mutual Funds — Equity',
      value: 630000,
      returnRate: DEFAULT_RATES.equityReturn,
      category: 'equity',
      liquidateAtRetirement: true,
    },
    {
      id: 'liquid-funds',
      name: 'Liquid — Funds',
      value: 363000,
      returnRate: DEFAULT_RATES.liquidReturn,
      category: 'liquid',
      liquidateAtRetirement: true,
    },
    {
      id: 'gold-digital',
      name: 'Gold — Digital',
      value: 133000,
      returnRate: DEFAULT_RATES.goldReturn,
      category: 'gold',
      liquidateAtRetirement: true,
    },
  ],
  sip: {
    amount: 90000,
    equitySplit: DEFAULT_ALLOCATION.equitySplit,
    debtSplit: DEFAULT_ALLOCATION.debtSplit,
    stepUp: 0,
    equityReturn: DEFAULT_RATES.equityReturn,
    debtReturn: DEFAULT_RATES.debtReturn,
  },
  stp: {
    active: true,
    source: 'idle-cash',
    lumpsum: 3500000,
    monthlyTransfer: 200000,
    liquidReturn: DEFAULT_RATES.liquidReturn,
    equitySplit: DEFAULT_ALLOCATION.equitySplit,
    debtSplit: DEFAULT_ALLOCATION.debtSplit,
    liquidCap: 1000000,
  },
  swp: {
    monthlyNeedToday: 150000,
    postRetirementReturn: DEFAULT_RATES.postRetirementReturn,
    taxRate: 10,
    startAge: 45,
    endAge: 80,
  },
});

export const scenarioA = (): Scenario => {
  const base = defaultClientInputs();
  return {
    id: 'scenario-a',
    name: 'Scenario A — Capital Deployment via STP',
    description:
      'Retain land. Deploy idle cash via Systematic Transfer Plan into an 85/15 equity/debt portfolio. ₹10L retained as emergency liquid buffer.',
    inputs: {
      ...base,
      stp: {
        ...base.stp,
        active: true,
        source: 'idle-cash',
        lumpsum: 3500000,
        monthlyTransfer: 200000,
      },
    },
  };
};

export const scenarioB = (): Scenario => {
  const base = defaultClientInputs();
  return {
    id: 'scenario-b',
    name: 'Scenario B — Maximum Growth via STP',
    description:
      'Sell land (₹1.12 Cr) when market conditions are favourable. Deploy the entire proceeds via STP into an 85/15 equity/debt portfolio, maximising long-term compounding.',
    inputs: {
      ...base,
      assets: base.assets.map((a) =>
        a.id === 're-plots'
          ? { ...a, value: 0, liquidateAtRetirement: true }
          : a,
      ),
      stp: {
        ...base.stp,
        active: true,
        source: 'land-sale',
        lumpsum: 14700000, // 35L idle cash + 112L land sale
        monthlyTransfer: 600000,
      },
    },
  };
};

export const defaultScenarios = (): Scenario[] => [scenarioA(), scenarioB()];
