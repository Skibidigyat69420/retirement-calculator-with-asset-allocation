import type { DecisionLogEntry } from '../../types';
import type { RiskDimension } from '../../lib/riskQuestionnaire';

/** Shared shape for the decision-log callback handed down from context. */
export type LogDecisionFn = (
  entry: Omit<DecisionLogEntry, 'id' | 'timestamp' | 'dateFormatted'>,
) => void;

export interface RiskGroup {
  id: string;
  index: string;
  title: string;
  description: string;
  dimensions: RiskDimension[];
}

/**
 * The eight scoring dimensions are presented as three editorial groups —
 * ability, willingness, and knowledge — the way a first-discovery meeting
 * would separate them.
 */
export const RISK_GROUPS: RiskGroup[] = [
  {
    id: 'capacity',
    index: 'I',
    title: 'Capacity — ability to take risk',
    description:
      'Time horizon, income stability, reserves and goal flexibility. The financial room to absorb losses and still meet the plan.',
    dimensions: ['time', 'capacity', 'liquidity', 'flexibility'],
  },
  {
    id: 'attitude',
    index: 'II',
    title: 'Attitude — willingness to take risk',
    description:
      'How the investor actually behaves in drawdowns and around missed rallies. The emotional side of the profile.',
    dimensions: ['tolerance', 'behavior'],
  },
  {
    id: 'experience',
    index: 'III',
    title: 'Experience — knowledge & context',
    description:
      'Familiarity with volatile assets, understanding of risk and return, and how concentrated the rest of the balance sheet is.',
    dimensions: ['knowledge', 'context'],
  },
];

export const DIMENSION_LABELS: Record<RiskDimension, string> = {
  time: 'Time Horizon',
  tolerance: 'Risk Tolerance',
  capacity: 'Risk Capacity',
  knowledge: 'Knowledge & Experience',
  liquidity: 'Liquidity Needs',
  flexibility: 'Goal Flexibility',
  behavior: 'Behavioural Stability',
  context: 'Portfolio Context',
};

/** Dimensions ordered by weight, for report tables. */
export const ORDERED_DIMENSIONS: RiskDimension[] = [
  'tolerance',
  'capacity',
  'time',
  'knowledge',
  'liquidity',
  'flexibility',
  'behavior',
  'context',
];
