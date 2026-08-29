import type { AssetCategory } from '../types';

export const COLORS = {
  cream: '#FDFBF7',
  paper: '#F6F4F0',
  warm: '#D1CDC3',
  warmDark: '#B0AAA0',
  navy: '#111111',
  ink: '#111111',
  gold: '#D1CDC3',
  red: '#A31621',
  accent: '#E7E2DD',
  textMain: '#1a1a1a',
  white: '#FFFFFF',
  success: '#1F5E22',
  danger: '#A31621',
  warning: '#B45F06',
};

export const ASSET_COLORS: Record<AssetCategory, string> = {
  equity: '#111111',
  debt: '#A31621',
  gold: '#D1CDC3',
  realestate: '#8C867E',
  liquid: '#B0AAA0',
  other: '#5C5C5C',
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
