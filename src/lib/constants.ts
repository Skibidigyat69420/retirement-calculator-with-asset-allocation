import type { AssetCategory } from '../types';

export const COLORS = {
  cream: '#f2f5f9',
  paper: '#161b26',
  warm: '#2b3444',
  warmDark: '#8b95a5',
  navy: '#8cff2e',
  navyDark: '#0a0d12',
  ink: '#8cff2e',
  gold: '#fbbf24',
  red: '#fb7185',
  accent: 'var(--color-border)',
  textMain: '#f2f5f9',
  textMuted: '#8b95a5',
  white: '#FFFFFF',
  success: '#34d399',
  danger: '#fb7185',
  warning: '#fbbf24',
};

export const ASSET_COLORS: Record<AssetCategory, string> = {
  equity: '#8cff2e',
  debt: '#7dd3fc',
  gold: '#fbbf24',
  realestate: '#a78bfa',
  liquid: '#34d399',
  other: '#94a3b8',
};

export const ASSET_LABELS: Record<AssetCategory, string> = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Commodities',
  realestate: 'Real Estate',
  liquid: 'Liquid',
  other: 'Other',
};

export const DEFAULT_RATES = {
  equityReturn: 12,
  debtReturn: 8,
  liquidReturn: 7,
  realEstateReturn: 3,
  goldReturn: 10,
  commoditiesReturn: 10,
  inflation: 5,
  postRetirementReturn: 9,
};

export const DEFAULT_ALLOCATION = {
  equitySplit: 85,
  debtSplit: 15,
};

export const RISK_FREE_RATE = 0.06;

/**
 * Domain-engine version. Bump per spec §143 (calculation versioning) whenever a
 * bug fix or formula change alters engine outputs, so stored results can be tied
 * to the engine that produced them. v2.1.0 = quantitative-correctness gate fixes
 * (audit Phase 1: Monte Carlo volatility scaling, STP/SIP state handling,
 * covariance mutation, full-covariance portfolio variance, MVO gradient).
 */
export const ENGINE_VERSION = '2.1.0';

export const CATEGORY_SIGMAS: Record<AssetCategory, number> = {
  equity: 0.15,
  debt: 0.05,
  gold: 0.18,
  realestate: 0.12,
  liquid: 0.01,
  other: 0.2,
};

// FX assumptions: annualized mean return (vs INR) and volatility.
// USD/INR mean ≈ long-term depreciation of INR (~4% p.a.), std ≈ 8%.
export const FX_ASSUMPTIONS: Record<string, { mean: number; std: number }> = {
  INR: { mean: 0, std: 0 },
  USD: { mean: 0.04, std: 0.08 },
};

export const GLIDE_PATH_PRESETS = {
  aggressive: [
    { age: 25, equity: 80, debt: 20 },
    { age: 40, equity: 70, debt: 30 },
    { age: 55, equity: 55, debt: 45 },
    { age: 65, equity: 40, debt: 60 },
  ],
  moderate: [
    { age: 25, equity: 70, debt: 30 },
    { age: 40, equity: 60, debt: 40 },
    { age: 55, equity: 45, debt: 55 },
    { age: 65, equity: 35, debt: 65 },
  ],
  conservative: [
    { age: 25, equity: 55, debt: 45 },
    { age: 40, equity: 50, debt: 50 },
    { age: 55, equity: 40, debt: 60 },
    { age: 65, equity: 30, debt: 70 },
  ],
};
