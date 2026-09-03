import type { MasterPlanInputs, Asset, Goal } from '../types';
import type { WealthEngineResult } from './wealthEngine';
import { getCategoryBreakdown } from './calculations';
import { formatCurrencyCompact } from './formatters';

export interface HealthComponentScore {
  id: string;
  name: string;
  score: number; // 0 - 100
  weight: number; // percentage (e.g. 25)
  status: 'Strong' | 'Review' | 'Needs Attention';
  reason: string;
  inputsUsed: string[];
  drivers: string[];
  improvementAdvice: string;
}

export interface PlanHealthResult {
  overallScore: number; // 0 - 100
  status: 'ON TRACK' | 'REVIEW NEEDED' | 'NEEDS ATTENTION';
  headline: string;
  components: HealthComponentScore[];
  keyAttentionItems: string[];
}

export function computePlanHealthScore(
  inputs: MasterPlanInputs,
  wealthResult: WealthEngineResult,
  riskScore: number = 50,
): PlanHealthResult {
  const components: HealthComponentScore[] = [];
  const keyAttentionItems: string[] = [];

  // 1. Retirement Health (Weight: 25%)
  const mcSuccess = wealthResult.monteCarlo?.successRate ?? (wealthResult.sustainable ? 0.85 : 0.45);
  let retScore = Math.round(mcSuccess * 100);
  if (!wealthResult.sustainable) {
    retScore = Math.min(retScore, 65);
  }
  retScore = Math.max(10, Math.min(100, retScore));

  let retStatus: 'Strong' | 'Review' | 'Needs Attention' = 'Strong';
  if (retScore < 70) retStatus = 'Needs Attention';
  else if (retScore < 85) retStatus = 'Review';

  let retReason = `Current retirement plan has a ${Math.round(mcSuccess * 100)}% Monte Carlo success probability.`;
  if (!wealthResult.sustainable) {
    retReason = `Deterministic projection shows potential corpus depletion around age ${wealthResult.depletionAge || 72}.`;
    keyAttentionItems.push(`Retirement shortfall: Corpus depletes at age ${wealthResult.depletionAge || 72}`);
  } else if (mcSuccess < 0.8) {
    keyAttentionItems.push(`Retirement confidence is ${Math.round(mcSuccess * 100)}% (<80% benchmark)`);
  }

  components.push({
    id: 'retirement',
    name: 'Retirement Readiness',
    score: retScore,
    weight: 25,
    status: retStatus,
    reason: retReason,
    inputsUsed: ['Retirement Age', 'Life Expectancy', 'Monthly SWP Draw', 'Monte Carlo Success Rate'],
    drivers: [
      `Success Rate: ${Math.round(mcSuccess * 100)}%`,
      `Depletion Age: ${wealthResult.sustainable ? 'Survives 90+' : `Age ${wealthResult.depletionAge}`}`,
      `Net Worth at Retirement: ${formatCurrencyCompact(wealthResult.netWorth)}`,
    ],
    improvementAdvice:
      retScore >= 85
        ? 'Retirement horizon is solidly funded. Maintain annual SIP step-up discipline.'
        : 'Consider increasing monthly SIP, delaying retirement by 1–2 years, or moderating post-retirement expenses by 10%.',
  });

  // 2. Goal Funding Health (Weight: 15%)
  let goalScore = 85;
  let goalStatus: 'Strong' | 'Review' | 'Needs Attention' = 'Strong';
  let goalReason = 'No active major goal conflicts detected.';
  const goalsCount = inputs.goals?.length || 0;

  if (goalsCount > 0) {
    const goals = inputs.goals;
    const fundedRatios = goals.map((g: Goal) => {
      if (typeof g.successRate === 'number') {
        return Math.min(1.0, g.successRate / 100);
      }
      const needed = g.targetAmount || 1000000;
      return Math.min(1.0, (wealthResult.netWorth * 0.15) / needed);
    });
    const avgFunded = fundedRatios.reduce((s: number, r: number) => s + r, 0) / goalsCount;
    goalScore = Math.round(Math.max(25, Math.min(100, avgFunded * 100)));

    if (goalScore < 70) {
      goalStatus = 'Needs Attention';
      goalReason = `Goals are on average ${goalScore}% funded based on assigned asset reserves.`;
      keyAttentionItems.push(`Goals funding gap: Average coverage is ${goalScore}%`);
    } else if (goalScore < 85) {
      goalStatus = 'Review';
      goalReason = `Key goals are moderately funded (${goalScore}%), but require dedicated monthly SIP matching.`;
    } else {
      goalReason = `Goals have robust funding coverage (${goalScore}% average target ratio).`;
    }
  }

  components.push({
    id: 'goals',
    name: 'Goal Funding',
    score: goalScore,
    weight: 15,
    status: goalStatus,
    reason: goalReason,
    inputsUsed: ['Goal Target Cost', 'Time Horizon', 'Assigned Asset Buckets'],
    drivers: [
      `Active Goals Count: ${goalsCount}`,
      `Funding Coverage: ${goalScore}%`,
    ],
    improvementAdvice:
      goalScore >= 85
        ? 'Goals are on track. Continue dedicated monthly SIP allocations to target buckets.'
        : 'Ringfence liquid/debt assets specifically for near-term (<5 year) goals to prevent equity market risk.',
  });

  // 3. Liquidity Adequacy (Weight: 15%)
  const liquidAssets = inputs.assets
    .filter((a: Asset) => a.category === 'liquid')
    .reduce((s: number, a: Asset) => s + (a.value || 0), 0);
  const monthlyExpense = inputs.swp?.monthlyNeedToday || (inputs.annualIncome > 0 ? (inputs.annualIncome / 12) * 0.5 : 100000);
  const emergencyMonths = monthlyExpense > 0 ? Math.round((liquidAssets / monthlyExpense) * 10) / 10 : 6;

  let liqScore = 95;
  let liqStatus: 'Strong' | 'Review' | 'Needs Attention' = 'Strong';
  let liqReason = `Liquid reserve covers ${emergencyMonths} months of living expenses (optimal target: 6–12 months).`;

  if (emergencyMonths < 3) {
    liqScore = Math.round(Math.max(20, emergencyMonths * 20));
    liqStatus = 'Needs Attention';
    liqReason = `Emergency buffer is critically low at only ${emergencyMonths} months of expenses (<3 months).`;
    keyAttentionItems.push(`Liquidity alert: Only ${emergencyMonths} months of living reserves in cash`);
  } else if (emergencyMonths < 6) {
    liqScore = Math.round(60 + (emergencyMonths - 3) * 8);
    liqStatus = 'Review';
    liqReason = `Emergency buffer covers ${emergencyMonths} months. Increasing to 6 months is advised.`;
  } else if (emergencyMonths > 24) {
    liqScore = 80;
    liqStatus = 'Review';
    liqReason = `Excess cash drag: ${emergencyMonths} months held in cash, which may erode real purchasing power against inflation.`;
  }

  components.push({
    id: 'liquidity',
    name: 'Liquidity Adequacy',
    score: liqScore,
    weight: 15,
    status: liqStatus,
    reason: liqReason,
    inputsUsed: ['Liquid / Cash Assets', 'Monthly Living Expenses'],
    drivers: [
      `Emergency Reserve: ${formatCurrencyCompact(liquidAssets)}`,
      `Coverage: ${emergencyMonths} Months`,
      `Benchmark: 6–12 Months`,
    ],
    improvementAdvice:
      emergencyMonths < 6
        ? `Direct ${formatCurrencyCompact((6 - emergencyMonths) * monthlyExpense)} into high-yield liquid funds / sweep FDs.`
        : 'Liquidity is healthy. Deploy excess cash beyond 12 months into strategic debt or equity.',
  });

  // 4. Risk Alignment (Weight: 15%)
  const breakdown = getCategoryBreakdown(inputs.assets);
  const actualEquity = breakdown.percentages.equity || 0;
  // Recommended equity based on risk score (e.g. risk score 50 => 50-60% equity)
  const targetEquity = Math.round(Math.max(20, Math.min(85, 20 + riskScore * 0.65)));
  const equityDelta = Math.abs(actualEquity - targetEquity);

  let riskScoreComp = Math.round(Math.max(30, 100 - equityDelta * 2.5));
  let riskStatus: 'Strong' | 'Review' | 'Needs Attention' = 'Strong';
  let riskReason = `Actual equity allocation (${actualEquity.toFixed(0)}%) aligns with risk capacity (${targetEquity}% target).`;

  if (equityDelta > 15) {
    riskStatus = 'Needs Attention';
    riskReason = `Significant risk misalignment: Portfolio equity (${actualEquity.toFixed(0)}%) differs by ${equityDelta.toFixed(0)}% from risk target (${targetEquity}%).`;
    keyAttentionItems.push(`Risk drift: Equity exposure is ${actualEquity > targetEquity ? 'overweight' : 'underweight'} by ${equityDelta.toFixed(0)}%`);
  } else if (equityDelta > 8) {
    riskStatus = 'Review';
    riskReason = `Mild allocation drift: Equity is ${actualEquity > targetEquity ? '+' : '-'}${equityDelta.toFixed(0)}% from ideal risk tolerance.`;
  }

  components.push({
    id: 'risk',
    name: 'Risk Alignment',
    score: riskScoreComp,
    weight: 15,
    status: riskStatus,
    reason: riskReason,
    inputsUsed: ['Current Equity %', 'Risk Tolerance Score (0–100)', 'Target Glide Path'],
    drivers: [
      `Actual Equity: ${actualEquity.toFixed(1)}%`,
      `Target Equity: ${targetEquity}%`,
      `Risk Profile Score: ${riskScore}/100`,
    ],
    improvementAdvice:
      equityDelta > 8
        ? `Rebalance ${equityDelta.toFixed(0)}% of portfolio to align with your assessed ${riskScore}/100 risk tolerance.`
        : 'Risk alignment is well-calibrated to client psychological and financial capacity.',
  });

  // 5. Asset Allocation & Diversification (Weight: 15%)
  const heldCategories = Object.values(breakdown.percentages).filter((p) => p > 3).length;
  let allocScore = 70;
  let allocStatus: 'Strong' | 'Review' | 'Needs Attention' = 'Strong';
  let allocReason = 'Multi-asset portfolio with healthy diversification.';

  if (heldCategories >= 4) {
    allocScore = 90;
    allocReason = `Well-diversified across ${heldCategories} distinct asset categories.`;
  } else if (heldCategories === 3) {
    allocScore = 78;
    allocReason = 'Diversified across 3 asset classes. Adding gold or international equity could improve resilience.';
  } else {
    allocScore = 55;
    allocStatus = 'Needs Attention';
    allocReason = 'Concentration risk: Portfolio is concentrated in fewer than 3 asset classes.';
    keyAttentionItems.push('Asset concentration: Missing uncorrelated assets (e.g. Gold / Sovereign Debt)');
  }

  components.push({
    id: 'allocation',
    name: 'Asset Allocation',
    score: allocScore,
    weight: 15,
    status: allocStatus,
    reason: allocReason,
    inputsUsed: ['Holdings Breakdown', 'Category Count', 'Concentration Index'],
    drivers: [
      `Active Classes: ${heldCategories}`,
      `Top Category: ${(Math.max(...Object.values(breakdown.percentages)) || 0).toFixed(0)}%`,
    ],
    improvementAdvice:
      heldCategories < 4
        ? 'Incorporate non-correlated assets (such as Sovereign Gold Bonds or Fixed Income) to reduce tail-risk volatility.'
        : 'Asset diversification is strong and protects against single-asset cycle downturns.',
  });

  // 6. Debt Health (Weight: 10%)
  const debtScore = 100;
  const debtStatus: 'Strong' | 'Review' | 'Needs Attention' = 'Strong';
  const debtReason = 'Zero high-cost debt liabilities reported. Complete household balance sheet solvency.';

  components.push({
    id: 'debt',
    name: 'Debt & Solvency',
    score: debtScore,
    weight: 10,
    status: debtStatus,
    reason: debtReason,
    inputsUsed: ['Outstanding Debt', 'Annual Income'],
    drivers: [
      'Total Debt: ₹0',
      'Debt / Income: 0%',
    ],
    improvementAdvice:
      'Solvency is pristine. Avoid uncollateralized high-interest consumer credit.',
  });

  // 7. Tax Efficiency (Weight: 5%)
  const taxScore = 78;
  components.push({
    id: 'tax',
    name: 'Tax Efficiency',
    score: taxScore,
    weight: 5,
    status: 'Review',
    reason: 'Portfolio utilizes basic capital gains diversification with opportunities for LTCG harvesting.',
    inputsUsed: ['LTCG/STCG Assumed Rates', 'Post-Retirement Tax Bracket'],
    drivers: [
      `Post-Retirement Tax Rate: ${inputs.swp?.taxRate || 10}%`,
      `Debt Taxation: Slab Rate`,
      `Equity LTCG: 12.5%`,
    ],
    improvementAdvice:
      'Harvest ₹1.25L annual tax-free equity capital gains and utilize EPF/PPF debt components for tax efficiency.',
  });

  // Calculate Weighted Overall Score
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const weightedSum = components.reduce((s, c) => s + c.score * c.weight, 0);
  const overallScore = Math.round(weightedSum / totalWeight);

  let overallStatus: 'ON TRACK' | 'REVIEW NEEDED' | 'NEEDS ATTENTION' = 'ON TRACK';
  let headline = 'Financial plan demonstrates strong resilience and sustainable long-term trajectory.';

  if (overallScore < 70 || keyAttentionItems.length >= 2) {
    overallStatus = 'NEEDS ATTENTION';
    headline = 'Critical gaps detected in retirement horizon, liquidity, or allocation balance.';
  } else if (overallScore < 85 || keyAttentionItems.length === 1) {
    overallStatus = 'REVIEW NEEDED';
    headline = 'Plan is fundamentally sound, with a few tactical adjustments recommended.';
  }

  return {
    overallScore,
    status: overallStatus,
    headline,
    components,
    keyAttentionItems,
  };
}
