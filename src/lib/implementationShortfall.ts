import type { TradeExecution, ImplementationShortfallResult, PreTradeEstimate } from '../types';

function toBps(value: number, benchmarkPrice: number): number {
  return benchmarkPrice > 0 ? (value / benchmarkPrice) * 10000 : 0;
}

/**
 * Post-trade implementation shortfall analysis.
 */
export function analyzeImplementationShortfall(trade: TradeExecution): ImplementationShortfallResult {
  const sideSign = trade.side === 'buy' ? 1 : -1;
  const shares = trade.quantity;
  const benchmark = trade.benchmarkPrice;
  const avgPx = trade.avgExecutionPrice;
  const arrival = trade.arrivalPrice;

  // Arrival shortfall: difference between arrival price and avg execution
  const arrivalShortfall = (avgPx - arrival) * sideSign;
  const arrivalShortfallBps = toBps(arrivalShortfall, arrival);

  // VWAP / TWAP slippage
  const vwapSlippage = (avgPx - trade.vwap) * sideSign;
  const vwapSlippageBps = toBps(vwapSlippage, trade.vwap);
  const twapSlippage = (avgPx - trade.twap) * sideSign;
  const twapSlippageBps = toBps(twapSlippage, trade.twap);

  // Market impact vs timing split
  const marketImpact = arrivalShortfall * 0.6;
  const timingCost = arrivalShortfall * 0.4;

  const totalCost = arrivalShortfall * shares + trade.explicitCost;
  const totalCostBps = toBps(totalCost / shares, benchmark);

  return {
    arrivalShortfall,
    arrivalShortfallBps,
    vwapSlippage,
    vwapSlippageBps,
    twapSlippage,
    twapSlippageBps,
    marketImpact,
    timingCost,
    explicitCost: trade.explicitCost,
    totalCost,
    totalCostBps,
  };
}

/**
 * Pre-trade cost estimate using a square-root market impact model.
 */
export function estimatePreTradeCost(
  _side: 'buy' | 'sell',
  quantity: number,
  avgDailyVolume: number,
  volatility: number,
  price: number,
  spreadBps: number,
  durationHours = 1,
): PreTradeEstimate {
  const notional = quantity * price;
  const participationRate = avgDailyVolume > 0 ? notional / avgDailyVolume : 0;
  const annualVol = volatility;

  // Square-root market impact model: I = a * sigma * sqrt(Q/ADV)
  const temporaryImpactBps = 1000 * annualVol * Math.sqrt(participationRate);
  const permanentImpactBps = 0.3 * temporaryImpactBps;
  const marketImpactBps = temporaryImpactBps + permanentImpactBps;

  // Timing risk grows with volatility and trade horizon
  const timingRiskBps = annualVol * 10000 * Math.sqrt(durationHours / (252 * 6.5));

  // Spread cost
  const spreadCostBps = spreadBps;

  const expectedShortfallBps = marketImpactBps + timingRiskBps + spreadCostBps;

  // Recommended duration: target 10-15% participation
  const recommendedDurationHours = avgDailyVolume > 0 && price > 0
    ? (quantity * price) / (0.12 * avgDailyVolume * price) * 6.5
    : 1;

  return {
    expectedShortfallBps,
    marketImpactBps,
    timingRiskBps,
    participationRate,
    recommendedDurationHours: Math.max(0.25, recommendedDurationHours),
  };
}

/**
 * Rebalancing impact simulator: estimate turnover and market impact
 * for moving from current weights to target weights.
 */
export function simulateRebalancing(
  currentWeights: Record<string, number>,
  targetWeights: Record<string, number>,
  portfolioValue: number,
  avgDailyVolumeByAsset: Record<string, number>,
  volatilityByAsset: Record<string, number>,
): {
  trades: { symbol: string; current: number; target: number; diff: number; value: number; impactBps: number }[];
  totalTurnover: number;
  totalImpactBps: number;
} {
  const symbols = Array.from(new Set([...Object.keys(currentWeights), ...Object.keys(targetWeights)]));
  let totalTurnover = 0;
  let totalImpact = 0;
  const trades = symbols.map((symbol) => {
    const current = currentWeights[symbol] || 0;
    const target = targetWeights[symbol] || 0;
    const diff = target - current;
    const value = Math.abs(diff) * portfolioValue;
    const adv = avgDailyVolumeByAsset[symbol] || portfolioValue * 0.01;
    const vol = volatilityByAsset[symbol] || 0.2;
    const impactBps = adv > 0 ? 1000 * vol * Math.sqrt(value / adv) : 0;
    totalTurnover += Math.abs(diff);
    totalImpact += impactBps * Math.abs(diff);
    return { symbol, current, target, diff, value, impactBps };
  });

  return {
    trades: trades.filter((t) => Math.abs(t.diff) > 0.001),
    totalTurnover,
    totalImpactBps: totalTurnover > 0 ? totalImpact / totalTurnover : 0,
  };
}
