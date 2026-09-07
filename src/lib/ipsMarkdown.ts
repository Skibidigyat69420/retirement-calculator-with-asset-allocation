import type { AssetCategory, GoalPriority } from '../types';

export interface IPSGoal {
  id: string;
  name: string;
  priority: GoalPriority;
  yearsToGoal: number;
  targetAmount: number;
}

export interface IPSAsset {
  id: string;
  name: string;
  category: AssetCategory;
  value: number;
}

export interface IPSState {
  client: {
    name: string;
    advisor: string;
    reviewDate: string;
    currentAge: number;
    retirementAge: number;
    lifeExpectancy: number;
    inflation: number;
  };
  returnObjective: string;
  riskTolerance: 'low' | 'moderate' | 'high';
  maxDrawdown: number;
  allocation: Record<AssetCategory, number>;
  currentAllocation: Record<AssetCategory, number>;
  baseCurrency: string;
  foreignExposure: number;
  hedgePolicy: string;
  implementationReview: string;
  goals: IPSGoal[];
  assets: IPSAsset[];
  notes: string;
}

export const categoryLabels: Record<AssetCategory, string> = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Commodities',
  realestate: 'Real Estate',
  liquid: 'Liquid',
  other: 'Other',
};

export function defaultState(): IPSState {
  return {
    client: {
      name: 'Vikram & Ananya Sharma',
      advisor: 'Sound Thesis Wealth Advisory',
      reviewDate: new Date().toISOString().split('T')[0],
      currentAge: 38,
      retirementAge: 60,
      lifeExpectancy: 90,
      inflation: 6,
    },
    returnObjective:
      'Achieve long-term compounding above inflation to fully fund lifetime liabilities, maintain retirement cash flow stability, and preserve real generational purchasing power across economic regimes.',
    riskTolerance: 'moderate',
    maxDrawdown: 15,
    allocation: {
      equity: 50,
      debt: 30,
      gold: 10,
      realestate: 0,
      liquid: 5,
      other: 5,
    },
    currentAllocation: {
      equity: 52.6,
      debt: 31.6,
      gold: 10.5,
      realestate: 0,
      liquid: 5.3,
      other: 0,
    },
    baseCurrency: 'INR',
    foreignExposure: 15,
    hedgePolicy:
      'Domestic currency baseline. International allocations remain unhedged for natural diversification benefit unless tactical foreign exchange volatility breaches predefined risk thresholds.',
    implementationReview:
      'Formal portfolio rebalancing is reviewed quarterly and executed whenever any strategic asset class breaches a ±5.0% absolute corridor drift. Full fiduciary review is conducted annually or immediately upon material changes in family circumstances, tax law, or liquidity requirements.',
    goals: [
      { id: 'g1', name: 'Retirement Corpus & Core Annuity', priority: 'essential', yearsToGoal: 22, targetAmount: 10_000_000 },
      { id: 'g2', name: 'Children Higher Education Trust', priority: 'important', yearsToGoal: 12, targetAmount: 3_000_000 },
    ],
    assets: [
      { id: 'a1', name: 'Broad Market Equity Index Funds', category: 'equity', value: 2_500_000 },
      { id: 'a2', name: 'Target Maturity G-Sec Bond Portfolio', category: 'debt', value: 1_500_000 },
      { id: 'a3', name: 'Sovereign Gold Bonds / Commodities (SGB)', category: 'gold', value: 500_000 },
      { id: 'a4', name: 'Treasury Bills & Overnight Liquid Fund', category: 'liquid', value: 250_000 },
    ],
    notes:
      'Client maintains a strong preference for low-cost passive index replication in equities, sovereign-backed instruments for liability hedging, and strict tax-loss harvesting discipline.',
  };
}

export function generateIPSMarkdown(state: IPSState, netWorth: number): string {
  const goalsMd =
    state.goals.length === 0
      ? '_No specific goals entered._'
      : state.goals
          .map(
            (g) =>
              `- **${g.name || '[Unnamed Goal]'}** (${g.priority.toUpperCase()} priority): ${g.yearsToGoal} years horizon, ₹${g.targetAmount.toLocaleString('en-IN')}`,
          )
          .join('\n');

  const assetsMd =
    state.assets.length === 0
      ? '_No asset holdings recorded._'
      : state.assets
          .map(
            (a) =>
              `- **${a.name || '[Unnamed Holding]'}** (${categoryLabels[a.category]}): ₹${a.value.toLocaleString('en-IN')}`,
          )
          .join('\n');

  return `# Investment Policy Statement
_Sound Thesis Institutional Wealth Policy Standard_

## 1. Client Identification & Governance Scope

- **Client Name(s):** ${state.client.name || '[To be completed]'}
- **Current Age:** ${state.client.currentAge}
- **Retirement Age:** ${state.client.retirementAge}
- **Life Expectancy Horizon:** ${state.client.lifeExpectancy}
- **Fiduciary Advisor / Firm:** ${state.client.advisor}
- **Review Date:** ${state.client.reviewDate}

## 2. Investment Objectives & Hurdle Rates

- **Return Objective:** ${state.returnObjective}
- **Risk Tolerance:** ${state.riskTolerance.charAt(0).toUpperCase() + state.riskTolerance.slice(1)}
- **Maximum Acceptable Drawdown:** ${state.maxDrawdown}% (12-month peak-to-trough corridor)
- **Inflation Baseline Assumption:** ${state.client.inflation}%

## 3. Portfolio Constraints & Liquidity Architecture

- **Liquidity:** Current total investable valuation is ₹${netWorth.toLocaleString('en-IN')}.
- **Planning Horizons:** ${Math.max(0, state.client.retirementAge - state.client.currentAge)} years accumulation phase; ${Math.max(0, state.client.lifeExpectancy - state.client.retirementAge)} years distribution phase.
- **Tax Governance:** Asset location and tax-loss harvesting reviewed systematically prior to fiscal year-end.

## 4. Priority-Tiered Goals & Liabilities

${goalsMd}

## 5. Strategic Asset Allocation (SAA) & Rebalancing Corridors

| Asset Class | Policy Target | Current Weight | Corridor (±5%) | Drift | Policy Status |
|-------------|---------------|----------------|----------------|-------|---------------|
| Equity | ${state.allocation.equity}% | ${state.currentAllocation.equity.toFixed(1)}% | ${Math.max(0, state.allocation.equity - 5)}% – ${state.allocation.equity + 5}% | ${(state.currentAllocation.equity - state.allocation.equity).toFixed(1)}% | ${Math.abs(state.currentAllocation.equity - state.allocation.equity) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.equity - state.allocation.equity) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Debt | ${state.allocation.debt}% | ${state.currentAllocation.debt.toFixed(1)}% | ${Math.max(0, state.allocation.debt - 5)}% – ${state.allocation.debt + 5}% | ${(state.currentAllocation.debt - state.allocation.debt).toFixed(1)}% | ${Math.abs(state.currentAllocation.debt - state.allocation.debt) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.debt - state.allocation.debt) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Gold | ${state.allocation.gold}% | ${state.currentAllocation.gold.toFixed(1)}% | ${Math.max(0, state.allocation.gold - 5)}% – ${state.allocation.gold + 5}% | ${(state.currentAllocation.gold - state.allocation.gold).toFixed(1)}% | ${Math.abs(state.currentAllocation.gold - state.allocation.gold) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.gold - state.allocation.gold) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Real Estate | ${state.allocation.realestate}% | ${state.currentAllocation.realestate.toFixed(1)}% | ${Math.max(0, state.allocation.realestate - 5)}% – ${state.allocation.realestate + 5}% | ${(state.currentAllocation.realestate - state.allocation.realestate).toFixed(1)}% | ${Math.abs(state.currentAllocation.realestate - state.allocation.realestate) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.realestate - state.allocation.realestate) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Liquid | ${state.allocation.liquid}% | ${state.currentAllocation.liquid.toFixed(1)}% | ${Math.max(0, state.allocation.liquid - 5)}% – ${state.allocation.liquid + 5}% | ${(state.currentAllocation.liquid - state.allocation.liquid).toFixed(1)}% | ${Math.abs(state.currentAllocation.liquid - state.allocation.liquid) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.liquid - state.allocation.liquid) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |
| Other | ${state.allocation.other}% | ${state.currentAllocation.other.toFixed(1)}% | ${Math.max(0, state.allocation.other - 5)}% – ${state.allocation.other + 5}% | ${(state.currentAllocation.other - state.allocation.other).toFixed(1)}% | ${Math.abs(state.currentAllocation.other - state.allocation.other) <= 2.0 ? 'Target Met' : Math.abs(state.currentAllocation.other - state.allocation.other) <= 5.0 ? 'Within Corridor' : 'Rebalance Triggered'} |

## 6. Balance Sheet Inventory & Asset Schedule

${assetsMd}

## 7. Currency Architecture & Hedging Mandate

- **Base Reporting Currency:** ${state.baseCurrency || 'INR'}
- **Offshore Exposure Limit:** ${state.foreignExposure}%
- **Hedging Directive:** ${state.hedgePolicy}

## 8. Execution Protocols & Rebalancing Rules

${state.implementationReview}

## 9. Special Covenants & Mandate Exclusions

${state.notes || 'No specific restrictions or covenants registered.'}

## 10. Fiduciary Execution & Ratification

- **Client Signature:** ____________________________________ Date: ${state.client.reviewDate}
- **Fiduciary Advisor Signature:** ____________________________ Date: ${state.client.reviewDate}
`;
}

export function parseIPSMarkdown(md: string): IPSState {
  const next = defaultState();
  const field = (label: string) => {
    const m = md.match(new RegExp(`^\\s*-\\s*\\*\\*${label}:\\*\\*\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const num = (raw: string | null) => {
    if (!raw) return null;
    const n = parseFloat(raw);
    return Number.isNaN(n) ? null : n;
  };

  const clientName = field('Client [Nn]ame\\(s\\)');
  if (clientName && clientName !== '[To be completed]') next.client.name = clientName;
  const advisor = field('(?:Advis?er / firm|Fiduciary Advis?er / Firm)');
  if (advisor) next.client.advisor = advisor;
  const reviewDate = field('(?:Next review date|Review Date)');
  if (reviewDate && /^\d{4}-\d{2}-\d{2}/.test(reviewDate)) next.client.reviewDate = reviewDate.slice(0, 10);

  const currentAge = num(field('Current [Aa]ge'));
  if (currentAge !== null) next.client.currentAge = Math.round(currentAge);
  const retirementAge = num(field('Retirement [Aa]ge'));
  if (retirementAge !== null) next.client.retirementAge = Math.round(retirementAge);
  const lifeExpectancy = num(field('(?:Life [Ee]xpectancy|Life Expectancy Horizon)'));
  if (lifeExpectancy !== null) next.client.lifeExpectancy = Math.round(lifeExpectancy);

  const returnObjective = field('Return [Oo]bjective');
  if (returnObjective) next.returnObjective = returnObjective;
  const riskTolerance = field('Risk [Tt]olerance')?.toLowerCase();
  if (riskTolerance?.includes('low')) next.riskTolerance = 'low';
  else if (riskTolerance?.includes('moderate')) next.riskTolerance = 'moderate';
  else if (riskTolerance?.includes('high')) next.riskTolerance = 'high';

  const maxDrawdown = num(field('(?:Maximum acceptable drawdown|Maximum Acceptable Drawdown)'));
  if (maxDrawdown !== null) next.maxDrawdown = maxDrawdown;

  const inflation = num(field('(?:Inflation assumption|Inflation Baseline Assumption)'));
  if (inflation !== null) next.client.inflation = inflation;

  // Table row parser for SAA targets
  const row = (label: string) => {
    const m = md.match(new RegExp(`^\\s*\\|\\s*${label}\\s*\\|\\s*([\\d.]+)%\\s*\\|\\s*([\\d.]+)%`, 'm'));
    return m ? { target: parseFloat(m[1]), current: parseFloat(m[2]) } : null;
  };

  const equity = row('Equity');
  if (equity) {
    next.allocation.equity = equity.target;
    next.currentAllocation.equity = equity.current;
  }
  const debt = row('Debt');
  if (debt) {
    next.allocation.debt = debt.target;
    next.currentAllocation.debt = debt.current;
  }
  const commodities = row('Commodities') || row('Gold');
  if (commodities) {
    next.allocation.gold = commodities.target;
    next.currentAllocation.gold = commodities.current;
  }
  const realestate = row('Real Estate');
  if (realestate) {
    next.allocation.realestate = realestate.target;
    next.currentAllocation.realestate = realestate.current;
  }
  const liquid = row('Liquid');
  if (liquid) {
    next.allocation.liquid = liquid.target;
    next.currentAllocation.liquid = liquid.current;
  }
  const other = row('Other');
  if (other) {
    next.allocation.other = other.target;
    next.currentAllocation.other = other.current;
  }

  const foreignExposure = num(field('(?:Foreign exposure limit|Offshore Exposure Limit)'));
  if (foreignExposure !== null) next.foreignExposure = foreignExposure;
  const hedgePolicy = field('(?:Hedging policy|Hedging Directive)');
  if (hedgePolicy) next.hedgePolicy = hedgePolicy;

  const baseCurrency = field('(?:Base currency|Base Reporting Currency)');
  if (baseCurrency) next.baseCurrency = baseCurrency;

  const implementationMatch = md.match(/##\s*(?:8\.\s*)?(?:Implementation & Review|Execution Protocols & Rebalancing Rules)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (implementationMatch) {
    next.implementationReview = implementationMatch[1].trim();
  }

  const notesMatch = md.match(/##\s*(?:9\.\s*)?(?:Special Notes|Special Covenants & Mandate Exclusions)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (notesMatch) {
    const notes = notesMatch[1].trim();
    next.notes = notes === 'None.' || notes.startsWith('No specific restrictions') ? '' : notes;
  }

  // Parse goals
  const goalsMatch = md.match(/##\s*(?:4\.\s*)?(?:Goals|Priority-Tiered Goals & Liabilities)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (goalsMatch) {
    const parsedGoals: IPSGoal[] = [];
    const lines = goalsMatch[1].trim().split('\n');
    let idx = 1;
    for (const line of lines) {
      const m = line.match(/^\s*-\s+(?:\*\*)?(.+?)(?:\*\*)?\s+\((?:(essential|important|aspirational)(?:\s+priority)?)\):\s+(\d+)\s+years?(?:\s+horizon)?,\s*₹?([\d,]+)/i);
      if (m) {
        parsedGoals.push({
          id: `g${idx++}`,
          name: m[1].trim(),
          priority: m[2].toLowerCase() as GoalPriority,
          yearsToGoal: parseInt(m[3], 10),
          targetAmount: parseInt(m[4].replace(/,/g, ''), 10),
        });
      }
    }
    if (parsedGoals.length > 0) next.goals = parsedGoals;
  }

  // Parse assets
  const assetsMatch = md.match(/##\s*(?:6\.\s*)?(?:Current Holdings|Balance Sheet Inventory & Asset Schedule)\s*\n+([\s\S]*?)(?=\n##|$)/);
  if (assetsMatch) {
    const parsedAssets: IPSAsset[] = [];
    const lines = assetsMatch[1].trim().split('\n');
    let idx = 1;
    for (const line of lines) {
      const m = line.match(/^\s*-\s+(?:\*\*)?(.+?)(?:\*\*)?\s+\((Equity|Debt|Gold|Commodities|Real Estate|Liquid|Other)\):\s*₹?([\d,]+)/i);
      if (m) {
        const catMap: Record<string, AssetCategory> = {
          Equity: 'equity',
          Debt: 'debt',
          Gold: 'gold',
          Commodities: 'gold',
          'Real Estate': 'realestate',
          Liquid: 'liquid',
          Other: 'other',
        };
        parsedAssets.push({
          id: `a${idx++}`,
          name: m[1].trim(),
          category: catMap[m[2]],
          value: parseInt(m[3].replace(/,/g, ''), 10),
        });
      }
    }
    if (parsedAssets.length > 0) next.assets = parsedAssets;
  }

  return next;
}
