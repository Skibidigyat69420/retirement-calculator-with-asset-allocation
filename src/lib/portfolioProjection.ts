export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  defaultFxRate: number; // expected annualized appreciation of this currency vs INR
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', name: 'Indian Rupee (Domestic)', symbol: '₹', defaultFxRate: 0.0 },
  { code: 'USD', name: 'US Dollar', symbol: '$', defaultFxRate: 3.5 },
  { code: 'EUR', name: 'Euro', symbol: '€', defaultFxRate: 2.5 },
  { code: 'GBP', name: 'British Pound', symbol: '£', defaultFxRate: 2.0 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', defaultFxRate: 3.5 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', defaultFxRate: 3.0 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', defaultFxRate: 0.5 },
];

export interface ProjectableAssetClass {
  id: string;
  name: string;
  weight: number; // percentage 0 - 100
  returnRate: number; // local return percentage p.a.
  currency: string; // e.g. 'INR', 'USD'
  fxRate: number; // expected currency appreciation vs INR % p.a.
  color?: string;
}

export interface PortfolioProjectionConfig {
  initialCorpus: number;
  monthlyContribution: number;
  annualStepUp: number; // percentage p.a.
  years: number;
  inflationRate: number; // percentage p.a.
  rebalanceAnnually: boolean;
  assetClasses: ProjectableAssetClass[];
}

export interface AssetClassYearlyValue {
  name: string;
  currency: string;
  nominalValue: number;
  realValue: number;
  effectiveWeight: number; // percentage
}

export interface PortfolioYearlySnapshot {
  year: number;
  totalInvested: number;
  nominalValue: number;
  realValue: number;
  nominalGain: number;
  realGain: number;
  assetBreakdown: AssetClassYearlyValue[];
}

export interface PortfolioProjectionResult {
  snapshots: PortfolioYearlySnapshot[];
  blendedNominalReturn: number; // percentage p.a.
  blendedRealReturn: number; // percentage p.a.
  totalInvested: number;
  terminalNominalWealth: number;
  terminalRealWealth: number;
  nominalMultiplier: number;
  realMultiplier: number;
  effectiveAssetReturns: {
    id: string;
    name: string;
    localReturn: number;
    currency: string;
    fxRate: number;
    effectiveInrReturn: number;
    realReturn: number;
  }[];
}

export function calculateEffectiveReturn(
  localReturnPercent: number,
  fxAppreciationPercent: number,
  inflationPercent: number,
): { inrReturn: number; realReturn: number } {
  const rLocal = localReturnPercent / 100;
  const rFx = fxAppreciationPercent / 100;
  const infl = inflationPercent / 100;

  // Exact Fisher compound return: (1 + r_local) * (1 + r_fx) - 1
  const rInr = (1 + rLocal) * (1 + rFx) - 1;

  // Real return net of inflation: (1 + r_inr) / (1 + infl) - 1
  const rReal = (1 + rInr) / (1 + infl) - 1;

  return {
    inrReturn: rInr * 100,
    realReturn: rReal * 100,
  };
}

export function projectPortfolioGrowth(
  config: PortfolioProjectionConfig,
): PortfolioProjectionResult {
  const {
    initialCorpus,
    monthlyContribution,
    annualStepUp,
    years,
    inflationRate,
    rebalanceAnnually,
    assetClasses,
  } = config;

  const totalWeight = assetClasses.reduce((s, a) => s + (a.weight || 0), 0) || 100;

  // 1. Calculate effective INR and Real returns for each asset class
  const effectiveAssetReturns = assetClasses.map((ac) => {
    const { inrReturn, realReturn } = calculateEffectiveReturn(
      ac.returnRate,
      ac.fxRate,
      inflationRate,
    );
    return {
      id: ac.id,
      name: ac.name,
      localReturn: ac.returnRate,
      currency: ac.currency,
      fxRate: ac.fxRate,
      effectiveInrReturn: inrReturn,
      realReturn,
    };
  });

  // Blended nominal return (weighted average of effective INR returns)
  const blendedNominalReturn = assetClasses.reduce((sum, ac, idx) => {
    const normalizedWeight = (ac.weight || 0) / totalWeight;
    return sum + normalizedWeight * effectiveAssetReturns[idx].effectiveInrReturn;
  }, 0);

  // Blended real return
  const blendedRealReturn =
    ((1 + blendedNominalReturn / 100) / (1 + inflationRate / 100) - 1) * 100;

  // 2. Simulate growth year by year
  const snapshots: PortfolioYearlySnapshot[] = [];

  // Track values per asset class
  let currentAssetValues = assetClasses.map((ac) => {
    const normalizedWeight = (ac.weight || 0) / totalWeight;
    return initialCorpus * normalizedWeight;
  });

  let cumulativeInvested = initialCorpus;
  let currentMonthlySip = monthlyContribution;

  // Year 0 snapshot
  snapshots.push({
    year: 0,
    totalInvested: initialCorpus,
    nominalValue: initialCorpus,
    realValue: initialCorpus,
    nominalGain: 0,
    realGain: 0,
    assetBreakdown: assetClasses.map((ac, idx) => ({
      name: ac.name,
      currency: ac.currency,
      nominalValue: currentAssetValues[idx],
      realValue: currentAssetValues[idx],
      effectiveWeight: (ac.weight || 0) / totalWeight * 100,
    })),
  });

  for (let y = 1; y <= years; y++) {
    const annualSipInflow = currentMonthlySip * 12;
    cumulativeInvested += annualSipInflow;

    if (rebalanceAnnually) {
      // With annual rebalancing:
      // Portfolio compounds at the blended rate plus inflow
      const previousTotal = currentAssetValues.reduce((s, v) => s + v, 0);
      // Inflow contributes half-year average compounding
      const grownPrevious = previousTotal * (1 + blendedNominalReturn / 100);
      const grownInflow = annualSipInflow * (1 + blendedNominalReturn / 100 / 2);
      const newTotal = Math.max(0, grownPrevious + grownInflow);

      // Distribute back to target normalized weights
      currentAssetValues = assetClasses.map((ac) => {
        const normalizedWeight = (ac.weight || 0) / totalWeight;
        return newTotal * normalizedWeight;
      });
    } else {
      // Buy & hold (drifting weights):
      // Each asset class grows according to its individual effective return
      currentAssetValues = currentAssetValues.map((val, idx) => {
        const normalizedWeight = (assetClasses[idx].weight || 0) / totalWeight;
        const acInflow = annualSipInflow * normalizedWeight;
        const rInr = effectiveAssetReturns[idx].effectiveInrReturn / 100;
        const grownVal = val * (1 + rInr);
        const grownInflow = acInflow * (1 + rInr / 2);
        return Math.max(0, grownVal + grownInflow);
      });
    }

    const totalNominal = currentAssetValues.reduce((s, v) => s + v, 0);
    // Real value deflated by compound inflation: Value / (1 + infl)^y
    const inflationFactor = Math.pow(1 + inflationRate / 100, y);
    const totalReal = inflationFactor > 0 ? totalNominal / inflationFactor : totalNominal;

    const nominalGain = totalNominal - cumulativeInvested;
    const realGain = totalReal - cumulativeInvested;

    const assetBreakdown: AssetClassYearlyValue[] = assetClasses.map((ac, idx) => {
      const nomVal = currentAssetValues[idx];
      return {
        name: ac.name,
        currency: ac.currency,
        nominalValue: Math.round(nomVal),
        realValue: Math.round(inflationFactor > 0 ? nomVal / inflationFactor : nomVal),
        effectiveWeight: totalNominal > 0 ? (nomVal / totalNominal) * 100 : 0,
      };
    });

    snapshots.push({
      year: y,
      totalInvested: Math.round(cumulativeInvested),
      nominalValue: Math.round(totalNominal),
      realValue: Math.round(totalReal),
      nominalGain: Math.round(nominalGain),
      realGain: Math.round(realGain),
      assetBreakdown,
    });

    // Step up monthly SIP for next year
    currentMonthlySip = currentMonthlySip * (1 + annualStepUp / 100);
  }

  const finalSnapshot = snapshots[snapshots.length - 1];
  const terminalNominalWealth = finalSnapshot?.nominalValue || initialCorpus;
  const terminalRealWealth = finalSnapshot?.realValue || initialCorpus;
  const finalInvested = finalSnapshot?.totalInvested || initialCorpus;

  const nominalMultiplier =
    finalInvested > 0 ? Math.round((terminalNominalWealth / finalInvested) * 100) / 100 : 1;
  const realMultiplier =
    finalInvested > 0 ? Math.round((terminalRealWealth / finalInvested) * 100) / 100 : 1;

  return {
    snapshots,
    blendedNominalReturn: Math.round(blendedNominalReturn * 100) / 100,
    blendedRealReturn: Math.round(blendedRealReturn * 100) / 100,
    totalInvested: Math.round(finalInvested),
    terminalNominalWealth: Math.round(terminalNominalWealth),
    terminalRealWealth: Math.round(terminalRealWealth),
    nominalMultiplier,
    realMultiplier,
    effectiveAssetReturns,
  };
}
