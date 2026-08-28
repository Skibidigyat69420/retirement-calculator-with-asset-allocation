import type { AssetCategory } from '../types';

export const COLORS = {
  cream: '#F4F1EA',
  navy: '#1A233A',
  gold: '#B68B40',
  accent: '#E6DCC3',
  textMain: '#333333',
  white: '#FFFFFF',
  success: '#2E7D32',
  danger: '#C62828',
  warning: '#F9A825',
};

export const ASSET_COLORS: Record<AssetCategory, string> = {
  equity: '#1A233A',
  debt: '#B68B40',
  gold: '#D4AF37',
  realestate: '#8D6E63',
  liquid: '#90A4AE',
  other: '#78909C',
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
