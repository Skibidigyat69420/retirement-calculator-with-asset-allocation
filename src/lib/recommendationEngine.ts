import type { MasterPlanInputs, Asset } from '../types';
import type { WealthEngineResult } from './wealthEngine';
import type { PlanHealthResult } from './planHealthScore';
import { getCategoryBreakdown } from './calculations';
import { formatCurrencyCompact } from './formatters';

export interface PlanRecommendation {
  id: string;
  priority: 1 | 2 | 3 | 4;
  category: 'Retirement' | 'Goals' | 'Portfolio' | 'Liquidity' | 'Debt';
  title: string;
  impact: string;
  reason: string;
  confidence: number; // percentage 0 - 100
  supportingCalculations: string[];
  whyExplainer: {
    current: string;
    target: string;
    driver: string;
    benefit: string;
  };
  actionType:
    | 'increase_sip'
    | 'redirect_sip'
    | 'adjust_retirement_age'
    | 'build_emergency_reserve'
    | 'rebalance_allocation';
  actionPayload: Record<string, any>;
  actionLabel: string;
}

export function generatePlanRecommendations(
  inputs: MasterPlanInputs,
  wealthResult: WealthEngineResult,
  planHealth: PlanHealthResult,
  riskScore: number = 50,
): PlanRecommendation[] {
  const recommendations: PlanRecommendation[] = [];

  const breakdown = getCategoryBreakdown(inputs.assets);
  const actualEquity = breakdown.percentages.equity || 0;
  const targetEquity = Math.round(Math.max(20, Math.min(85, 20 + riskScore * 0.65)));
  const equityDrift = actualEquity - targetEquity;

  const monthlyExpense =
    inputs.swp?.monthlyNeedToday || (inputs.annualIncome > 0 ? (inputs.annualIncome / 12) * 0.5 : 100000);
  const liquidAssets = inputs.assets
    .filter((a: Asset) => a.category === 'liquid')
    .reduce((s: number, a: Asset) => s + (a.value || 0), 0);
  const emergencyMonths = monthlyExpense > 0 ? liquidAssets / monthlyExpense : 6;
  const mcSuccess = wealthResult.monteCarlo?.successRate ?? (wealthResult.sustainable ? 0.85 : 0.45);

  // 1. Retirement Recommendations (Priority 1)
  const retComp = planHealth.components.find((c) => c.id === 'retirement');
  const needsRetirementBoost = !wealthResult.sustainable || mcSuccess < 0.85 || (retComp ? retComp.score < 80 : false);

  if (needsRetirementBoost) {
    const recommendedSipDelta = Math.round(Math.max(10000, inputs.sip.amount * 0.25) / 5000) * 5000;
    recommendations.push({
      id: 'rec-ret-sip',
      priority: 1,
      category: 'Retirement',
      title: `Increase Monthly SIP by ${formatCurrencyCompact(recommendedSipDelta)}`,
      impact: `Improves retirement success probability from ${Math.round(mcSuccess * 100)}% to 92%+`,
      reason: `Current corpus faces shortfall risk around age ${wealthResult.depletionAge || 72}. Additional SIP bridges the compounding gap.`,
      confidence: Math.min(98, Math.max(85, planHealth.overallScore + 10)),
      supportingCalculations: [
        `Current SIP: ${formatCurrencyCompact(inputs.sip.amount)}/mo`,
        `Recommended SIP: ${formatCurrencyCompact(inputs.sip.amount + recommendedSipDelta)}/mo`,
        `Estimated Additional Terminal Capital: ${formatCurrencyCompact(recommendedSipDelta * 12 * Math.max(1, inputs.retirementAge - inputs.currentAge) * 1.8)}`,
      ],
      whyExplainer: {
        current: `${Math.round(mcSuccess * 100)}% Monte Carlo success rate`,
        target: '90%+ institutional safety threshold',
        driver: `Compounding horizon of ${Math.max(1, inputs.retirementAge - inputs.currentAge)} years before retirement`,
        benefit: `Guarantees perpetual post-retirement cash flows through age ${inputs.lifeExpectancy}`,
      },
      actionType: 'increase_sip',
      actionPayload: {
        newSipAmount: inputs.sip.amount + recommendedSipDelta,
      },
      actionLabel: `Apply +${formatCurrencyCompact(recommendedSipDelta)} SIP`,
    });

    if (inputs.retirementAge < 62) {
      recommendations.push({
        id: 'rec-ret-age',
        priority: 1,
        category: 'Retirement',
        title: `Review Target Retirement Age to ${inputs.retirementAge + 2}`,
        impact: `Increases wealth accumulation by 2 years of compounding + salary inflows`,
        reason: `Moving retirement from age ${inputs.retirementAge} to ${inputs.retirementAge + 2} increases success probability without lifestyle sacrifice.`,
        confidence: 90,
        supportingCalculations: [
          `Current Retirement Age: ${inputs.retirementAge}`,
          `Proposed Retirement Age: ${inputs.retirementAge + 2}`,
          `2 Additional Inflow Years: ~${formatCurrencyCompact(inputs.annualIncome * 2 * 0.4)} net savings added`,
        ],
        whyExplainer: {
          current: `Retire at Age ${inputs.retirementAge}`,
          target: `Retire at Age ${inputs.retirementAge + 2}`,
          driver: 'Lower distribution duration coupled with longer accumulation window',
          benefit: 'Eliminates shortfall risk while preserving full lifestyle expenditure',
        },
        actionType: 'adjust_retirement_age',
        actionPayload: {
          newRetirementAge: inputs.retirementAge + 2,
        },
        actionLabel: `Set Retirement to Age ${inputs.retirementAge + 2}`,
      });
    }
  }

  // 2. Asset Allocation & Equity Drift (Priority 2 or 3)
  if (Math.abs(equityDrift) >= 7) {
    if (equityDrift > 0) {
      // Overweight equity: redirect fresh SIP to Debt or rebalance
      const shiftAmount = Math.round((equityDrift / 100) * wealthResult.netWorth);
      recommendations.push({
        id: 'rec-alloc-equity-overweight',
        priority: 2,
        category: 'Portfolio',
        title: `Redirect Fresh Inflows Toward Fixed Income (${equityDrift.toFixed(0)}% Equity Overweight)`,
        impact: `Reduces crisis drawdown risk by ~${formatCurrencyCompact(shiftAmount * 0.35)} in a market crash`,
        reason: `Portfolio equity is ${actualEquity.toFixed(0)}% vs strategic target ${targetEquity}%. Rebalance by routing future SIP to debt funds.`,
        confidence: 88,
        supportingCalculations: [
          `Actual Equity: ${actualEquity.toFixed(1)}%`,
          `Target Strategic Equity: ${targetEquity}%`,
          `Drift: +${equityDrift.toFixed(1)}% (${formatCurrencyCompact(shiftAmount)})`,
        ],
        whyExplainer: {
          current: `${actualEquity.toFixed(0)}% Equity exposure`,
          target: `${targetEquity}% Target Allocation`,
          driver: 'Excess equity volatility elevates peak-to-trough tail-risk drawdowns',
          benefit: 'Locks in equity profits and creates fixed-income buffer without triggering capital gains taxes',
        },
        actionType: 'rebalance_allocation',
        actionPayload: {
          targetEquity,
          targetDebt: 100 - targetEquity - 10,
        },
        actionLabel: `Rebalance to ${targetEquity}% Target Equity`,
      });
    } else {
      // Underweight equity
      recommendations.push({
        id: 'rec-alloc-equity-underweight',
        priority: 3,
        category: 'Portfolio',
        title: `Deploy Surplus Cash to Equities (${Math.abs(equityDrift).toFixed(0)}% Equity Underweight)`,
        impact: `Boosts multi-decade portfolio CAGR by 1.2%–1.8% p.a.`,
        reason: `Portfolio is under-allocated to growth equities (${actualEquity.toFixed(0)}% vs ${targetEquity}% target), creating long-term inflation risk.`,
        confidence: 85,
        supportingCalculations: [
          `Actual Equity: ${actualEquity.toFixed(1)}%`,
          `Target Equity: ${targetEquity}%`,
          `Deficit: ${Math.abs(equityDrift).toFixed(1)}%`,
        ],
        whyExplainer: {
          current: `${actualEquity.toFixed(0)}% Equity exposure`,
          target: `${targetEquity}% Target Allocation`,
          driver: 'Cash and low-yield debt drag real returns below inflation over 10+ year horizons',
          benefit: 'Accelerates compound terminal wealth creation',
        },
        actionType: 'rebalance_allocation',
        actionPayload: {
          targetEquity,
        },
        actionLabel: `Rebalance to ${targetEquity}% Equity`,
      });
    }
  }

  // 3. Liquidity Emergency Reserve (Priority 2 if <4 months)
  if (emergencyMonths < 6) {
    const requiredLiquid = Math.round(monthlyExpense * 6);
    const topUpAmount = Math.max(0, requiredLiquid - liquidAssets);
    recommendations.push({
      id: 'rec-liq-emergency',
      priority: emergencyMonths < 3 ? 1 : 3,
      category: 'Liquidity',
      title: `Build Emergency Reserve of ${formatCurrencyCompact(topUpAmount)}`,
      impact: `Establishes 6 months of household financial solvency (${formatCurrencyCompact(requiredLiquid)} buffer)`,
      reason: `Current liquid reserves cover only ${emergencyMonths.toFixed(1)} months of expenses. A shock could force premature equity liquidation.`,
      confidence: 96,
      supportingCalculations: [
        `Monthly Living Expenses: ${formatCurrencyCompact(monthlyExpense)}/mo`,
        `Current Liquid Buffer: ${formatCurrencyCompact(liquidAssets)} (${emergencyMonths.toFixed(1)} mos)`,
        `Target 6-Month Buffer: ${formatCurrencyCompact(requiredLiquid)}`,
      ],
      whyExplainer: {
        current: `${emergencyMonths.toFixed(1)} months liquid cash`,
        target: '6.0 months emergency reserves',
        driver: 'Unforeseen medical, job transition, or urgent family contingencies',
        benefit: 'Prevents distress-selling of long-term equities during market corrections',
      },
      actionType: 'build_emergency_reserve',
      actionPayload: {
        topUpAmount,
      },
      actionLabel: `Allocate ${formatCurrencyCompact(topUpAmount)} to Liquid Funds`,
    });
  }

  // Sort by priority (1 is highest)
  return recommendations.sort((a, b) => a.priority - b.priority);
}
