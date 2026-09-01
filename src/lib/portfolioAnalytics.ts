import type { AssetCategory, PortfolioHoldingAnalytics, PortfolioMetrics } from '../types';
import { mean } from './returns';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export function categorizeSymbol(symbol: string): AssetCategory {
  const s = symbol.toUpperCase();
  if (s.includes('NIFTY') || s.includes('SENSEX') || s.includes('BEES')) return 'equity';
  if (s.includes('GOLD')) return 'gold';
  if (s.includes('LIQUID') || s.includes('BOND') || s.includes('GILT')) return 'debt';
  if (s.includes('REIT') || s.includes('LAND') || s.includes('PROPERTY')) return 'realestate';
  return 'other';
}

export function computePortfolioHoldings(
  holdings: { symbol: string; token: string; exchange: string; quantity: number; averageprice: number; ltp: number }[],
): PortfolioHoldingAnalytics[] {
  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.ltp, 0);
  return holdings.map((h) => {
    const value = h.quantity * h.ltp;
    const invested = h.quantity * h.averageprice;
    const pnl = value - invested;
    return {
      symbol: h.symbol,
      token: h.token,
      exchange: h.exchange,
      quantity: h.quantity,
      avgPrice: h.averageprice,
      ltp: h.ltp,
      value,
      invested,
      pnl,
      pnlPercent: invested > 0 ? (pnl / invested) * 100 : 0,
      weight: totalValue > 0 ? (value / totalValue) * 100 : 0,
      category: categorizeSymbol(h.symbol),
    };
  });
}

export function computePortfolioMetrics(
  holdingAnalytics: PortfolioHoldingAnalytics[],
  benchmarkReturns: number[] = [],
  riskFreeRate = 0.06,
  covMatrix?: number[][],
): PortfolioMetrics {
  const totalValue = holdingAnalytics.reduce((sum, h) => sum + h.value, 0);
  const totalInvested = holdingAnalytics.reduce((sum, h) => sum + h.invested, 0);
  const totalPnl = totalValue - totalInvested;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // Weighted average return assumption by category
  const categoryReturns: Record<AssetCategory, number> = {
    equity: 0.12,
    debt: 0.07,
    gold: 0.08,
    realestate: 0.06,
    liquid: 0.05,
    other: 0.06,
  };

  const weights = holdingAnalytics.map((h) => h.value / (totalValue || 1));
  const expectedReturn = holdingAnalytics.reduce(
    (sum, h, i) => sum + weights[i] * categoryReturns[h.category],
    0,
  );

  const categoryVolatilities: Record<AssetCategory, number> = {
    equity: 0.15,
    debt: 0.05,
    gold: 0.18,
    realestate: 0.12,
    liquid: 0.01,
    other: 0.2,
  };

  // Full covariance wᵀΣw: aggregate weights by category, use covMatrix when
  // provided, else a diagonal matrix of category volatilities
  const categoryWeights = CATEGORIES.map((c) =>
    holdingAnalytics.reduce((sum, h, i) => sum + (h.category === c ? weights[i] : 0), 0),
  );
  const sigma = CATEGORIES.map((ci, i) =>
    CATEGORIES.map((_cj, j) =>
      covMatrix?.[i]?.[j] ?? (i === j ? Math.pow(categoryVolatilities[ci], 2) : 0),
    ),
  );
  const portfolioVariance = categoryWeights.reduce((sum, wi, i) =>
    sum + categoryWeights.reduce((inner, wj, j) => inner + wi * wj * sigma[i][j], 0)
  , 0);
  const annualizedVolatility = Math.sqrt(portfolioVariance);

  const sharpe = annualizedVolatility > 0 ? (expectedReturn - riskFreeRate) / annualizedVolatility : 0;

  // Sortino: downside deviation below risk-free
  const downsideDeviation = annualizedVolatility * 0.6; // proxy
  const sortino = downsideDeviation > 0 ? (expectedReturn - riskFreeRate) / downsideDeviation : 0;

  // VaR / CVaR (parametric)
  const var95 = totalValue * (expectedReturn - 1.645 * annualizedVolatility);
  const cvar95 = totalValue * (expectedReturn - 2.06 * annualizedVolatility);

  // Beta to benchmark
  const portfolioReturns = holdingAnalytics.map((h, i) => categoryReturns[h.category] * weights[i]);
  const beta = computeBeta(portfolioReturns, benchmarkReturns);
  const alpha = expectedReturn - (riskFreeRate + beta * 0.09);

  // Correlation to benchmark proxy
  const correlation = benchmarkReturns.length > 0 ? 0.85 : 0;

  // Max drawdown proxy
  const maxDrawdown = -annualizedVolatility * 1.5;

  return {
    totalValue,
    totalInvested,
    totalPnl,
    totalPnlPercent,
    annualizedReturn: expectedReturn,
    annualizedVolatility,
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    maxDrawdown,
    beta,
    alpha,
    var95,
    cvar95,
    correlationToBenchmark: correlation,
  };
}

function computeBeta(assetReturns: number[], marketReturns: number[]): number {
  if (marketReturns.length === 0 || assetReturns.length === 0) return 1;
  const n = Math.min(assetReturns.length, marketReturns.length);
  const a = assetReturns.slice(0, n);
  const m = marketReturns.slice(0, n);
  const meanA = mean(a);
  const meanM = mean(m);
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < n; i++) {
    cov += (a[i] - meanA) * (m[i] - meanM);
    varM += Math.pow(m[i] - meanM, 2);
  }
  return varM > 0 ? cov / varM : 1;
}

export function computeRollingReturns(prices: number[], windowDays: number): { date: number; return: number }[] {
  if (prices.length <= windowDays) return [];
  const result: { date: number; return: number }[] = [];
  for (let i = windowDays; i < prices.length; i++) {
    const start = prices[i - windowDays];
    const end = prices[i];
    if (start > 0) {
      result.push({ date: i, return: (end / start) - 1 });
    }
  }
  return result;
}

export function computeDrawdowns(prices: number[]): { date: number; drawdown: number }[] {
  let peak = -Infinity;
  return prices.map((price, i) => {
    if (price > peak) peak = price;
    return { date: i, drawdown: peak > 0 ? (price - peak) / peak : 0 };
  });
}

export function computeAttribution(holdings: PortfolioHoldingAnalytics[]): { category: AssetCategory; value: number; weight: number; pnl: number }[] {
  const byCategory = new Map<AssetCategory, { value: number; pnl: number }>();
  CATEGORIES.forEach((c) => byCategory.set(c, { value: 0, pnl: 0 }));
  holdings.forEach((h) => {
    const cur = byCategory.get(h.category) || { value: 0, pnl: 0 };
    cur.value += h.value;
    cur.pnl += h.pnl;
    byCategory.set(h.category, cur);
  });
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  return CATEGORIES.map((c) => {
    const data = byCategory.get(c)!;
    return { category: c, value: data.value, weight: totalValue > 0 ? (data.value / totalValue) * 100 : 0, pnl: data.pnl };
  }).filter((d) => d.value > 0);
}
