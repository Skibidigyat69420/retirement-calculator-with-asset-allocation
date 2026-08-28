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
