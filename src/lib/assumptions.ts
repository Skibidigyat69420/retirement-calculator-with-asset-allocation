import type { AssetCategory } from '../types';
import type { MarketDataSet } from './marketData';
import { alignMarketData } from './marketData';
import { DEFAULT_RATES, FX_ASSUMPTIONS } from './constants';

export interface CategoryAssumptions {
  mean: number; // annualized decimal return
  std: number; // annualized decimal volatility
}

export interface FXAssumption {
  mean: number; // annualized decimal return vs base currency (INR)
  std: number;  // annualized decimal volatility
}

export interface AssumptionSet {
  categories: Record<AssetCategory, CategoryAssumptions>;
  covariance: Record<AssetCategory, Record<AssetCategory, number>>;
  correlation: Record<AssetCategory, Record<AssetCategory, number>>;
  fx: Record<string, FXAssumption>;
  fetchedAt: string;
  source: 'angel' | 'default';
}

const CATEGORY_SYMBOL_MAP: Partial<Record<AssetCategory, string[]>> = {
  equity: ['NIFTY50', 'NIFTYNEXT50', 'NIFTYMID150'],
  debt: ['LIQUIDBEES'],
  gold: ['GOLDBEES'],
  liquid: ['LIQUIDBEES'],
};

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function buildAssumptionsFromMarketData(marketData: MarketDataSet): AssumptionSet {
  const categories: Partial<Record<AssetCategory, CategoryAssumptions>> = {};

  (Object.keys(CATEGORY_SYMBOL_MAP) as AssetCategory[]).forEach((cat) => {
    const symbols = CATEGORY_SYMBOL_MAP[cat] || [];
    const stats = symbols
      .map((sym) => {
        const idx = marketData.symbols.indexOf(sym);
        return idx >= 0 ? marketData.stats[idx] : null;
      })
      .filter(Boolean);

    if (stats.length > 0) {
      categories[cat] = {
        mean: average(stats.map((s) => s!.annualizedReturn)),
        std: average(stats.map((s) => s!.annualizedVolatility)),
      };
    }
  });

  const result: Record<AssetCategory, CategoryAssumptions> = {
    equity: categories.equity || { mean: DEFAULT_RATES.equityReturn / 100, std: 0.15 },
    debt: categories.debt || { mean: DEFAULT_RATES.debtReturn / 100, std: 0.05 },
    gold: categories.gold || { mean: DEFAULT_RATES.goldReturn / 100, std: 0.18 },
    realestate: { mean: DEFAULT_RATES.realEstateReturn / 100, std: 0.12 },
    liquid: categories.liquid || { mean: DEFAULT_RATES.liquidReturn / 100, std: 0.01 },
    other: { mean: 0.08, std: 0.2 },
  };

  // Build covariance from market data where available
  const cov: Record<AssetCategory, Record<AssetCategory, number>> = {
    equity: { equity: 0.0225, debt: 0.001, gold: 0.002, realestate: 0.005, liquid: 0.0001, other: 0.003 },
    debt: { equity: 0.001, debt: 0.0025, gold: 0.0005, realestate: 0.001, liquid: 0.0001, other: 0.0005 },
    gold: { equity: 0.002, debt: 0.0005, gold: 0.04, realestate: 0.001, liquid: 0.0001, other: 0.001 },
    realestate: { equity: 0.005, debt: 0.001, gold: 0.001, realestate: 0.01, liquid: 0.0001, other: 0.002 },
    liquid: { equity: 0.0001, debt: 0.0001, gold: 0.0001, realestate: 0.0001, liquid: 0.0001, other: 0.0001 },
    other: { equity: 0.003, debt: 0.0005, gold: 0.001, realestate: 0.002, liquid: 0.0001, other: 0.02 },
  };

  const catList: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];
  catList.forEach((cat) => {
    catList.forEach((cat2) => {
      cov[cat][cat2] = result[cat].std * result[cat2].std * 0.2;
      if (cat === cat2) cov[cat][cat2] = result[cat].std * result[cat].std;
    });
  });

  // Override with market data covariance for available symbols. The bundle stores full
  // per-symbol histories, so we align the mapped symbols to their common history first.
  const mappedSymbols = Array.from(
    new Set((Object.values(CATEGORY_SYMBOL_MAP) as string[][]).flat()),
  ).filter((sym) => marketData.symbols.includes(sym));

  if (mappedSymbols.length >= 2) {
    try {
      const aligned = alignMarketData(marketData, mappedSymbols);
      const symbolToCategory = new Map<string, AssetCategory>();
      (Object.keys(CATEGORY_SYMBOL_MAP) as AssetCategory[]).forEach((cat) => {
        (CATEGORY_SYMBOL_MAP[cat] || []).forEach((sym) => symbolToCategory.set(sym, cat));
      });

      aligned.symbols.forEach((sym1, i) => {
        const cat1 = symbolToCategory.get(sym1);
        if (!cat1) return;
        aligned.symbols.forEach((sym2, j) => {
          const cat2 = symbolToCategory.get(sym2);
          if (!cat2) return;
          cov[cat1][cat2] = aligned.covariance[i][j];
        });
      });
    } catch {
      // Ignore alignment failures and keep default covariance.
    }
  }

  // Correlation
  const correlation: Record<AssetCategory, Record<AssetCategory, number>> = { ...cov };
  catList.forEach((cat) => {
    catList.forEach((cat2) => {
      const denom = result[cat].std * result[cat2].std;
      correlation[cat][cat2] = denom > 0 ? cov[cat][cat2] / denom : 0;
    });
  });

  return {
    categories: result,
    covariance: cov,
    correlation,
    fx: { ...FX_ASSUMPTIONS },
    fetchedAt: marketData.fetchedAt,
    source: 'angel',
  };
}

export function getDefaultAssumptions(): AssumptionSet {
  return {
    categories: {
      equity: { mean: DEFAULT_RATES.equityReturn / 100, std: 0.15 },
      debt: { mean: DEFAULT_RATES.debtReturn / 100, std: 0.05 },
      gold: { mean: DEFAULT_RATES.goldReturn / 100, std: 0.18 },
      realestate: { mean: DEFAULT_RATES.realEstateReturn / 100, std: 0.12 },
      liquid: { mean: DEFAULT_RATES.liquidReturn / 100, std: 0.01 },
      other: { mean: 0.08, std: 0.2 },
    },
    covariance: {
      equity: { equity: 0.0225, debt: 0.001, gold: 0.002, realestate: 0.005, liquid: 0.0001, other: 0.003 },
      debt: { equity: 0.001, debt: 0.0025, gold: 0.0005, realestate: 0.001, liquid: 0.0001, other: 0.0005 },
      gold: { equity: 0.002, debt: 0.0005, gold: 0.04, realestate: 0.001, liquid: 0.0001, other: 0.001 },
      realestate: { equity: 0.005, debt: 0.001, gold: 0.001, realestate: 0.01, liquid: 0.0001, other: 0.002 },
      liquid: { equity: 0.0001, debt: 0.0001, gold: 0.0001, realestate: 0.0001, liquid: 0.0001, other: 0.0001 },
      other: { equity: 0.003, debt: 0.0005, gold: 0.001, realestate: 0.002, liquid: 0.0001, other: 0.02 },
    },
    correlation: {
      equity: { equity: 1, debt: 0.2, gold: 0.1, realestate: 0.4, liquid: 0.05, other: 0.3 },
      debt: { equity: 0.2, debt: 1, gold: 0.15, realestate: 0.1, liquid: 0.1, other: 0.1 },
      gold: { equity: 0.1, debt: 0.15, gold: 1, realestate: 0.05, liquid: 0, other: 0.05 },
      realestate: { equity: 0.4, debt: 0.1, gold: 0.05, realestate: 1, liquid: 0.05, other: 0.2 },
      liquid: { equity: 0.05, debt: 0.1, gold: 0, realestate: 0.05, liquid: 1, other: 0.05 },
      other: { equity: 0.3, debt: 0.1, gold: 0.05, realestate: 0.2, liquid: 0.05, other: 1 },
    },
    fx: { ...FX_ASSUMPTIONS },
    fetchedAt: new Date().toISOString(),
    source: 'default',
  };
}

const ASSUMPTIONS_STORAGE_KEY = 'soundthesis_assumptions';

export function saveAssumptions(assumptions: AssumptionSet): void {
  localStorage.setItem(ASSUMPTIONS_STORAGE_KEY, JSON.stringify(assumptions));
}

export function loadAssumptions(): AssumptionSet {
  try {
    const raw = localStorage.getItem(ASSUMPTIONS_STORAGE_KEY);
    if (raw) {
      const parsed: AssumptionSet = JSON.parse(raw);
      if (!parsed.fx) parsed.fx = { ...FX_ASSUMPTIONS };
      return parsed;
    }
  } catch {
    // ignore
  }
  return getDefaultAssumptions();
}
