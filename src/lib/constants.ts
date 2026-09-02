import type { AssetCategory } from '../types';

export const COLORS = {
  cream: '#f8fafc',
  paper: '#ffffff',
  warm: '#e2e8f0',
  warmDark: '#94a3b8',
  navy: '#4f46e5',
  navyDark: '#3730a3',
  ink: '#0f172a',
  gold: '#f59e0b',
  red: '#e11d48',
  accent: '#e2e8f0',
  textMain: '#0f172a',
  textMuted: '#64748b',
  white: '#FFFFFF',
  success: '#10b981',
  danger: '#e11d48',
  warning: '#f59e0b',
};

export const ASSET_COLORS: Record<AssetCategory, string> = {
  equity: '#4f46e5',
  debt: '#06b6d4',
  gold: '#f59e0b',
  realestate: '#8b5cf6',
  liquid: '#10b981',
  other: '#64748b',
};

export const ASSET_LABELS: Record<AssetCategory, string> = {
  equity: 'Equity',
  debt: 'Debt',
  gold: 'Gold',
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
  inflation: 5,
  postRetirementReturn: 9,
};

export const DEFAULT_ALLOCATION = {
  equitySplit: 85,
  debtSplit: 15,
};

export const RISK_FREE_RATE = 0.06;

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
