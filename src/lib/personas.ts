import type { MasterPlanInputs, RiskAnswers } from '../types';
import {
  aaravClientInputs,
  demoClientInputs,
  khannaClientInputs,
  sampleClientInputs,
  vikramClientInputs,
} from './scenarios';

/**
 * Sample-data personas: opt-in, fully-built planning workspaces grouped with
 * display metadata for the persona picker. The two legacy scenario factories
 * (John Doe, Sharma household) are exposed as personas so every entry point
 * loads through one roster.
 */
export interface Persona {
  id: string;
  label: string;
  tagline: string;
  lifeStage: string;
  riskStyle: string;
  initials: string;
  accent: string;
  description: string;
  riskAnswers?: RiskAnswers;
  build: () => MasterPlanInputs;
}

/** Plausible answer maps aligned to the fourteen-question risk questionnaire. */
const AARAV_RISK_ANSWERS: RiskAnswers = {
  'time-horizon-main': 10,
  'time-horizon-retirement': 8,
  'loss-reaction': 9,
  'drawdown-tolerance': 10,
  'income-stability': 10,
  'net-worth-income': 3,
  'experience': 5,
  'understanding-risk': 5,
  'emergency-fund': 10,
  'liquidity-needs': 8,
  'goal-timing-flexibility': 8,
  'past-behavior': 5,
  'regret-reaction': 10,
  'portfolio-concentration': 3,
};

const VIKRAM_RISK_ANSWERS: RiskAnswers = {
  'time-horizon-main': 5,
  'time-horizon-retirement': 5,
  'loss-reaction': 6,
  'drawdown-tolerance': 8,
  'income-stability': 7,
  'net-worth-income': 8,
  'experience': 8,
  'understanding-risk': 8,
  'emergency-fund': 8,
  'liquidity-needs': 8,
  'goal-timing-flexibility': 3,
  'past-behavior': 8,
  'regret-reaction': 7,
  'portfolio-concentration': 5,
};

const KHANNA_RISK_ANSWERS: RiskAnswers = {
  'time-horizon-main': 1,
  'time-horizon-retirement': 1,
  'loss-reaction': 1,
  'drawdown-tolerance': 1,
  'income-stability': 3,
  'net-worth-income': 8,
  'experience': 3,
  'understanding-risk': 3,
  'emergency-fund': 8,
  'liquidity-needs': 1,
  'goal-timing-flexibility': 1,
  'past-behavior': 3,
  'regret-reaction': 1,
  'portfolio-concentration': 8,
};

export const PERSONAS: Persona[] = [
  {
    id: 'aarav-mehta',
    label: 'Aarav Mehta',
    tagline: 'Early-career tech professional chasing FIRE',
    lifeStage: 'Accumulation · Age 28',
    riskStyle: 'Aggressive',
    initials: 'AM',
    accent: 'from-emerald-500 to-teal-600',
    description: 'Single Bengaluru engineer putting an 80/20 ₹60k SIP to work for a retire-at-45 corpus. Four goals, no liabilities, and a fully-funded emergency buffer.',
    riskAnswers: AARAV_RISK_ANSWERS,
    build: aaravClientInputs,
  },
  {
    id: 'john-doe',
    label: 'John Doe',
    tagline: 'Mid-career tech exec planning early retirement',
    lifeStage: 'Accumulation · Age 38',
    riskStyle: 'Growth',
    initials: 'JD',
    accent: 'from-sky-500 to-indigo-600',
    description: 'Married tech executive targeting retirement at 50 with two children’s educations funded, a mountain retreat, and recurring luxury vacations.',
    build: demoClientInputs,
  },
  {
    id: 'sharma-household',
    label: 'Sharma Family',
    tagline: 'Dual-income family balancing kids, parents and legacy',
    lifeStage: 'Multi-generational · 5 members',
    riskStyle: 'Balanced',
    initials: 'SH',
    accent: 'from-amber-500 to-orange-600',
    description: 'Five-member Bengaluru household with two earners, school-going children and a dependent parent. Full ownership tagging across all six asset categories.',
    build: sampleClientInputs,
  },
  {
    id: 'vikram-rao',
    label: 'Vikram Rao',
    tagline: 'Late starter playing catch-up for retirement',
    lifeStage: 'Accumulation · Age 48',
    riskStyle: 'Growth',
    initials: 'VR',
    accent: 'from-violet-500 to-purple-600',
    description: 'Mumbai marketing director who began saving in earnest at 42. A ₹1.5L monthly SIP with an 8% step-up, two loans, and five goals to sequence.',
    riskAnswers: VIKRAM_RISK_ANSWERS,
    build: vikramClientInputs,
  },
  {
    id: 'khanna-couple',
    label: 'Sunita & Ashok Khanna',
    tagline: 'Pre-retirement couple engineering a smooth exit',
    lifeStage: 'Pre-retirement · Age 57',
    riskStyle: 'Conservative',
    initials: 'SK',
    accent: 'from-cyan-600 to-blue-700',
    description: 'Hyderabad couple three years from retirement with a ₹4.2Cr debt-heavy corpus, SWP and STP configured, and withdrawal-strategy plus estate advice on the agenda.',
    riskAnswers: KHANNA_RISK_ANSWERS,
    build: khannaClientInputs,
  },
];

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((persona) => persona.id === id);
}
