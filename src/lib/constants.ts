import type { AssetCategory } from '../types';

export const COLORS = {
  cream: '#F4F2ED',
  paper: '#FFFFFF',
  warm: '#E8E5DA',
  warmDark: '#A8A29A',
  navy: '#20231F',
  navyDark: '#151815',
  ink: '#1B1D17',
  gold: '#B3945A',
  red: '#B45348',
  accent: '#E8E5DA',
  textMain: '#1B1D17',
  textMuted: '#6E7268',
  white: '#FFFFFF',
  success: '#3E7A57',
  danger: '#B45348',
  warning: '#B07C24',
};

export const ASSET_COLORS: Record<AssetCategory, string> = {
  equity: '#111111',
  debt: '#3A3A3A',
  gold: '#626262',
  realestate: '#898989',
  liquid: '#B0B0B0',
  other: '#D6D6D6',
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
export const FX_ASSUMPTIONS: Record<string, { mean: number; std: number; spotRate: number }> = {
  INR: { mean: 0, std: 0, spotRate: 1.0 },
  USD: { mean: 0.04, std: 0.08, spotRate: 83.5 },
  EUR: { mean: 0.03, std: 0.07, spotRate: 91.2 },
  GBP: { mean: 0.03, std: 0.09, spotRate: 106.4 },
  SGD: { mean: 0.02, std: 0.05, spotRate: 61.8 },
  AUD: { mean: 0.02, std: 0.09, spotRate: 54.6 },
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
