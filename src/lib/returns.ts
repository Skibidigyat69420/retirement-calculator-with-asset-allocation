export interface PriceSeries {
  symbol: string;
  dates: string[];
  closes: number[];
}

export interface ReturnStats {
  symbol: string;
  annualizedReturn: number; // decimal, e.g. 0.12 for 12%
  annualizedVolatility: number; // decimal
  sharpeRatio: number;
  maxDrawdown: number; // decimal negative, e.g. -0.30
  count: number;
}

export function computeLogReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  return returns;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function annualizeDailyReturn(dailyMean: number, tradingDays = 252): number {
  return dailyMean * tradingDays;
}

export function annualizeDailyVolatility(dailyStd: number, tradingDays = 252): number {
  return dailyStd * Math.sqrt(tradingDays);
}

export function computeReturnStats(symbol: string, closes: number[], riskFreeRate = 0.06): ReturnStats {
  const returns = computeLogReturns(closes);
  const dailyMean = mean(returns);
  const dailyStd = stdDev(returns);
  const annualReturn = annualizeDailyReturn(dailyMean);
  const annualVol = annualizeDailyVolatility(dailyStd);
  const sharpe = annualVol > 0 ? (annualReturn - riskFreeRate) / annualVol : 0;

  // Max drawdown
  let peak = -Infinity;
  let maxDd = 0;
  for (const price of closes) {
    if (price > peak) peak = price;
    const dd = (price - peak) / peak;
    if (dd < maxDd) maxDd = dd;
  }

  return {
    symbol,
    annualizedReturn: annualReturn,
    annualizedVolatility: annualVol,
    sharpeRatio: sharpe,
    maxDrawdown: maxDd,
    count: returns.length,
  };
}

export function alignSeries(series: PriceSeries[]): { dates: string[]; matrix: number[][] } {
  if (series.length === 0) return { dates: [], matrix: [] };

  // Build date -> close map for each series
  const maps = series.map((s) => {
    const map = new Map<string, number>();
    s.dates.forEach((d, i) => map.set(d, s.closes[i]));
    return map;
  });

  // Intersection of all dates that have data in every series
  const commonDates = series[0].dates.filter((d) => maps.every((m) => m.has(d)));
  const matrix = series.map((_, idx) => commonDates.map((d) => maps[idx].get(d)!));

  return { dates: commonDates, matrix };
}

export function computeCovarianceMatrix(returnsMatrix: number[][]): number[][] {
  const n = returnsMatrix.length;
  if (n === 0) return [];
  const obs = returnsMatrix[0].length;
  if (obs < 2) return Array.from({ length: n }, () => Array(n).fill(0));

  const means = returnsMatrix.map((r) => mean(r));
  const cov: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < obs; k++) {
        sum += (returnsMatrix[i][k] - means[i]) * (returnsMatrix[j][k] - means[j]);
      }
      const value = sum / (obs - 1);
      cov[i][j] = value;
      cov[j][i] = value;
    }
  }

  // Annualize covariance
  const tradingDays = 252;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cov[i][j] *= tradingDays;
    }
  }

  return cov;
}

export function computeCorrelationMatrix(cov: number[][]): number[][] {
  const n = cov.length;
  const corr: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const denom = Math.sqrt(cov[i][i] * cov[j][j]);
      corr[i][j] = denom > 0 ? cov[i][j] / denom : 0;
    }
  }
  return corr;
}

export function buildReturnsMatrix(priceMatrix: number[][]): number[][] {
  return priceMatrix.map((prices) => computeLogReturns(prices));
}
