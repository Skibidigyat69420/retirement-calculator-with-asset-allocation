import type { AssetCategory, ManualAllocationPolicy, MasterPlanInputs, RiskAnswers } from '../types';
import type { ClientSummary } from './api';
import { aaravClientInputs, khannaClientInputs, sampleClientInputs } from './scenarios';

export type CRMStage =
  | 'Lead'
  | 'Discovery'
  | 'Risk Profiling'
  | 'IPS Draft'
  | 'Review & Approval'
  | 'Active Mandate'
  | 'Annual Review';

export type CRMTier = 'Retail' | 'Affluent' | 'HNI' | 'Ultra HNI' | 'Family Office';

export interface CRMInteraction {
  id: string;
  clientId: string;
  date: string;
  type: 'meeting' | 'call' | 'email' | 'review' | 'note';
  title: string;
  notes: string;
  nextAction?: string;
  actionCompleted?: boolean;
  advisorName?: string;
}

/**
 * The offline practice workspace keeps an explicit snapshot per household.
 * This prevents a planner's work for one client from leaking into the next
 * client selected in the directory. The hosted API keeps its own versioned
 * plan records; this is only the resilient local-workspace equivalent.
 */
export interface CRMPlanSnapshot {
  inputs: MasterPlanInputs;
  riskAnswers: RiskAnswers;
  manualTargets: Record<AssetCategory, number> | null;
  manualAllocationPolicy: ManualAllocationPolicy | null;
  updatedAt: string;
}

export interface CRMClient extends ClientSummary {
  email?: string;
  phone?: string;
  pan?: string;
  tier?: CRMTier;
  stage?: CRMStage;
  tags?: string[];
  reviewDate?: string;
  ratifiedDate?: string;
  currentAge?: number;
  retirementAge?: number;
  lifeExpectancy?: number;
  annualIncome?: number;
  monthlyLivingExpenses?: number;
  inflation?: number;
  primaryGoal?: string;
  policyNotes?: string;
  targetAllocation?: Record<AssetCategory, number>;
  interactions?: CRMInteraction[];
  planSnapshot?: CRMPlanSnapshot;
  swpMonthlyNeed?: number;
  swpStartAge?: number;
  swp?: {
    monthlyNeedToday: number;
    postRetirementReturn: number;
    taxRate: number;
    startAge: number;
    endAge: number;
  };
}

export const CRM_STAGES: CRMStage[] = [
  'Lead',
  'Discovery',
  'Risk Profiling',
  'IPS Draft',
  'Review & Approval',
  'Active Mandate',
  'Annual Review',
];

export const CRM_TIERS: CRMTier[] = ['Retail', 'Affluent', 'HNI', 'Ultra HNI', 'Family Office'];

const LOCAL_CLIENTS_KEY = 'stw.local-client-directory.v4';
const ACTIVE_CLIENT_KEY = 'stw.activeClientId';
const CRM_LOGS_PREFIX = 'stw.crm.interactions.';

const SAMPLE_CLIENTS: CRMClient[] = [
  // 1. ACTIVE CLIENT: Mid-career mass-affluent family mandate
  {
    id: 'sample-household',
    name: 'Sample Household',
    status: 'Active',
    stage: 'Active Mandate',
    tier: 'Affluent',
    email: 'sample.household@example.com',
    phone: '+91 98450 12345',
    pan: 'AABCS9912D',
    tags: ['Active Mandate', 'Dual Earner', 'Multi-Goal', 'Moderate Allocation', 'Core SWP'],
    householdId: 'household-sample',
    assignedPractitioners: [
      { userId: 'advisor-1', fullName: 'SoundThesis Capital', assignmentRole: 'Lead Adviser' },
    ],
    reviewDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    currentAge: 40,
    retirementAge: 60,
    lifeExpectancy: 82,
    annualIncome: 2400000,
    monthlyLivingExpenses: 75000,
    inflation: 6.0,
    primaryGoal: 'Retirement at 60 with ₹70,000/mo SWP & children education',
    policyNotes: 'Moderate 50/35/10/5 balanced allocation. Systematic monthly SIP of ₹35,000 with modest annual step-up. Core retirement SWP of ₹70,000/mo structured from age 60.',
    targetAllocation: {
      equity: 50,
      debt: 35,
      gold: 10,
      realestate: 0,
      liquid: 5,
      other: 0,
    },
    swpMonthlyNeed: 70000,
    swpStartAge: 60,
    swp: {
      monthlyNeedToday: 70000,
      postRetirementReturn: 7.5,
      taxRate: 10,
      startAge: 60,
      endAge: 82,
    },
    financialSummary: {
      netWorth: 6900000,
      investableAssets: 4500000,
      totalAssets: 9900000,
      totalLiabilities: 3000000,
      byCategory: { equity: 2000000, debt: 1650000, gold: 500000, liquid: 400000, realestate: 5350000 },
      assetCount: 18,
    },
    planSnapshot: {
      inputs: sampleClientInputs(),
      riskAnswers: {
        'time-horizon-main': 5,
        'time-horizon-retirement': 5,
        'loss-reaction': 6,
        'drawdown-tolerance': 5,
        'income-stability': 5,
        'net-worth-income': 5,
        'experience': 5,
        'understanding-risk': 5,
        'emergency-fund': 5,
        'liquidity-needs': 5,
        'goal-timing-flexibility': 5,
        'past-behavior': 5,
        'regret-reaction': 3,
        'portfolio-concentration': 5,
      },
      manualTargets: { equity: 50, debt: 35, gold: 10, realestate: 0, liquid: 5, other: 0 },
      manualAllocationPolicy: null,
      updatedAt: new Date().toISOString(),
    },
    interactions: [
      {
        id: 'sample-int-1',
        clientId: 'sample-household',
        date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        type: 'meeting',
        title: 'Annual Mandate Review & SWP Glide Path',
        notes: 'Reviewed middle-income household portfolio. ₹35k/mo SIP running across diversified equity and fixed income. Validated retirement SWP requirement of ₹70k/mo from age 60 with sequence-of-returns protection.',
        nextAction: 'Rebalance asset allocation in April',
        actionCompleted: false,
        advisorName: 'SoundThesis Capital',
      },
    ],
  },

  // 2. PROSPECT: Early-career tech professional exploring FIRE
  {
    id: 'prospect-aarav',
    name: 'Aarav Mehta',
    status: 'Prospect',
    stage: 'Discovery',
    tier: 'Retail',
    email: 'aarav.mehta@example.com',
    phone: '+91 98861 40217',
    pan: 'AARPM7712E',
    tags: ['Prospect', 'Early Career', 'Tech Professional', 'Long Runway', 'Future SWP'],
    householdId: 'household-aarav',
    assignedPractitioners: [
      { userId: 'advisor-1', fullName: 'SoundThesis Capital', assignmentRole: 'Lead Adviser' },
    ],
    reviewDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
    currentAge: 28,
    retirementAge: 45,
    lifeExpectancy: 85,
    annualIncome: 3200000,
    monthlyLivingExpenses: 90000,
    inflation: 6.0,
    primaryGoal: 'FIRE Corpus (Retire at 45) with ₹60,000/mo SWP',
    policyNotes: 'Early-career software engineer pursuing financial independence by 45. Aggressive 80/20 equity-debt SIP. Modeling future retirement SWP of ₹60,000/mo from age 45.',
    targetAllocation: {
      equity: 80,
      debt: 15,
      gold: 0,
      realestate: 0,
      liquid: 5,
      other: 0,
    },
    swpMonthlyNeed: 60000,
    swpStartAge: 45,
    swp: {
      monthlyNeedToday: 60000,
      postRetirementReturn: 8.5,
      taxRate: 10,
      startAge: 45,
      endAge: 85,
    },
    financialSummary: {
      netWorth: 2400000,
      investableAssets: 2400000,
      totalAssets: 2400000,
      totalLiabilities: 0,
      byCategory: { equity: 1350000, debt: 0, gold: 0, liquid: 1050000, realestate: 0, other: 0 },
      assetCount: 4,
    },
    planSnapshot: {
      inputs: aaravClientInputs(),
      riskAnswers: {
        'time-horizon-main': 10,
        'time-horizon-retirement': 8,
        'loss-reaction': 9,
        'drawdown-tolerance': 10,
        'income-stability': 7,
        'net-worth-income': 3,
        'experience': 5,
        'understanding-risk': 5,
        'emergency-fund': 8,
        'liquidity-needs': 8,
        'goal-timing-flexibility': 8,
        'past-behavior': 5,
        'regret-reaction': 7,
        'portfolio-concentration': 3,
      },
      manualTargets: { equity: 80, debt: 15, gold: 0, realestate: 0, liquid: 5, other: 0 },
      manualAllocationPolicy: null,
      updatedAt: new Date().toISOString(),
    },
    interactions: [
      {
        id: 'aarav-int-1',
        clientId: 'prospect-aarav',
        date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
        type: 'meeting',
        title: 'Prospect Discovery & FIRE Roadmap',
        notes: 'Initial consultation with prospective client Aarav (age 28, senior software engineer). Evaluated current ₹60k/mo SIP against age-45 FIRE corpus. Modeled future SWP requirement of ₹60,000/mo over a 40-year retirement span.',
        nextAction: 'Complete full risk profile & draft investment policy',
        actionCompleted: false,
        advisorName: 'SoundThesis Capital',
      },
    ],
  },

  // 3. NEARING SWP: Pre-retirement transition mandate (starts in ~3 years)
  {
    id: 'client-khanna',
    name: 'Sunita & Ashok Khanna',
    status: 'Active',
    stage: 'Review & Approval',
    tier: 'HNI',
    email: 'khanna.household@example.com',
    phone: '+91 99481 26670',
    pan: 'AAHPK4418K',
    tags: ['Nearing SWP', 'Pre-Retirement', 'HNI', 'Capital Preservation', 'Immediate Decumulation'],
    householdId: 'household-khanna',
    assignedPractitioners: [
      { userId: 'advisor-1', fullName: 'SoundThesis Capital', assignmentRole: 'Lead Adviser' },
    ],
    reviewDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    currentAge: 57,
    retirementAge: 60,
    lifeExpectancy: 85,
    annualIncome: 6360000,
    monthlyLivingExpenses: 120000,
    inflation: 6.0,
    primaryGoal: 'Transitioning to ₹1,20,000/mo SWP at age 60 with medical buffer',
    policyNotes: 'Pre-retirement couple 3 years from retirement at age 60. Shifted allocation to debt and liquid assets (25/55/10/5/5). Structured an immediate ₹1,20,000/mo tax-efficient SWP starting at age 60.',
    targetAllocation: {
      equity: 25,
      debt: 55,
      gold: 10,
      realestate: 5,
      liquid: 5,
      other: 0,
    },
    swpMonthlyNeed: 120000,
    swpStartAge: 60,
    swp: {
      monthlyNeedToday: 120000,
      postRetirementReturn: 7.5,
      taxRate: 10,
      startAge: 60,
      endAge: 85,
    },
    financialSummary: {
      netWorth: 42000000,
      investableAssets: 28500000,
      totalAssets: 42000000,
      totalLiabilities: 0,
      byCategory: { equity: 4500000, debt: 14500000, gold: 2000000, liquid: 7500000, realestate: 13500000 },
      assetCount: 8,
    },
    planSnapshot: {
      inputs: khannaClientInputs(),
      riskAnswers: {
        'time-horizon-main': 1,
        'time-horizon-retirement': 1,
        'loss-reaction': 1,
        'drawdown-tolerance': 1,
        'income-stability': 5,
        'net-worth-income': 8,
        'experience': 3,
        'understanding-risk': 3,
        'emergency-fund': 8,
        'liquidity-needs': 1,
        'goal-timing-flexibility': 1,
        'past-behavior': 3,
        'regret-reaction': 1,
        'portfolio-concentration': 8,
      },
      manualTargets: { equity: 25, debt: 55, gold: 10, realestate: 5, liquid: 5, other: 0 },
      manualAllocationPolicy: null,
      updatedAt: new Date().toISOString(),
    },
    interactions: [
      {
        id: 'khanna-int-1',
        clientId: 'client-khanna',
        date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10),
        type: 'meeting',
        title: 'Pre-Retirement SWP Structuring & Bucket Strategy',
        notes: 'Sunita is 3 years from retirement at age 60. Finalized decumulation strategy with an initial SWP of ₹1,20,000/mo. Earmarked 3 years of living expenses in liquid FDs and sweep accounts to guard against sequence-of-returns shock in early retirement.',
        nextAction: 'Finalize medical contingency reserve and coordinate LIC annuity payout',
        actionCompleted: false,
        advisorName: 'SoundThesis Capital',
      },
    ],
  },
];

/** Read all clients from local storage, pre-populating defaults if empty. */
export function getCRMClients(): CRMClient[] {
  try {
    const raw = localStorage.getItem(LOCAL_CLIENTS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(SAMPLE_CLIENTS));
      return SAMPLE_CLIENTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(SAMPLE_CLIENTS));
      return SAMPLE_CLIENTS;
    }
    return parsed as CRMClient[];
  } catch {
    return SAMPLE_CLIENTS;
  }
}

/** Get the currently selected client or the first client available. */
export function getActiveCRMClient(): CRMClient | null {
  const clients = getCRMClients();
  if (clients.length === 0) return null;
  const activeId = localStorage.getItem(ACTIVE_CLIENT_KEY);
  if (activeId) {
    const found = clients.find((c) => c.id === activeId);
    if (found) return found;
  }
  return clients[0] ?? null;
}

/** Return the explicitly selected local CRM record, without a fallback.
 * Server-backed plans use the same active-client key but need not have a
 * duplicate record in the browser directory. */
export function getSelectedCRMClient(): CRMClient | null {
  const activeId = localStorage.getItem(ACTIVE_CLIENT_KEY);
  if (!activeId) return null;
  return getCRMClients().find((client) => client.id === activeId) ?? null;
}

/** Set active client ID in localStorage and dispatch event. */
export function setActiveCRMClient(clientId: string): void {
  localStorage.setItem(ACTIVE_CLIENT_KEY, clientId);
  window.dispatchEvent(new Event('stw:active-client-changed'));
}

export function saveCRMClient(client: CRMClient): void {
  const clients = getCRMClients();
  const index = clients.findIndex((c) => c.id === client.id);
  const updatedClient: CRMClient = { ...client };
  if (client.planSnapshot?.inputs.swp) {
    updatedClient.swp = { ...client.planSnapshot.inputs.swp };
    updatedClient.swpMonthlyNeed = client.planSnapshot.inputs.swp.monthlyNeedToday;
    updatedClient.swpStartAge = client.planSnapshot.inputs.swp.startAge;
  }
  let next: CRMClient[];
  if (index >= 0) {
    next = [...clients];
    next[index] = { ...next[index], ...updatedClient };
  } else {
    next = [updatedClient, ...clients];
  }
  localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('stw:clients-updated'));
}

/** Create a new CRM client. */
export function createCRMClient(data: Partial<CRMClient>): CRMClient {
  const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const defaultMonthlyExpenses = data.monthlyLivingExpenses || 0;
  const defaultRetirementAge = data.retirementAge || 60;
  const defaultLifeExpectancy = data.lifeExpectancy || 85;
  const defaultSWPNeed = data.swpMonthlyNeed || data.swp?.monthlyNeedToday || (defaultMonthlyExpenses ? Math.round(defaultMonthlyExpenses * 0.9) : 60000);
  const defaultSWPStartAge = data.swpStartAge || data.swp?.startAge || defaultRetirementAge;

  const newClient: CRMClient = {
    id,
    name: data.name?.trim() || 'New Client Relationship',
    status: data.status || 'Active',
    stage: data.stage || 'Discovery',
    tier: data.tier || 'Affluent',
    email: data.email || '',
    phone: data.phone || '',
    pan: data.pan || '',
    tags: data.tags || ['New Relationship'],
    householdId: `hh-${id}`,
    assignedPractitioners: data.assignedPractitioners || [
      { userId: 'advisor-lead', fullName: 'SoundThesis Capital', assignmentRole: 'Lead Adviser' },
    ],
    reviewDate: data.reviewDate || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    currentAge: data.currentAge || 40,
    retirementAge: defaultRetirementAge,
    lifeExpectancy: defaultLifeExpectancy,
    annualIncome: data.annualIncome || 0,
    monthlyLivingExpenses: defaultMonthlyExpenses,
    inflation: data.inflation || 6,
    primaryGoal: data.primaryGoal || 'Financial Independence',
    policyNotes: data.policyNotes || '',
    targetAllocation: data.targetAllocation || {
      equity: 50,
      debt: 35,
      gold: 5,
      realestate: 5,
      liquid: 5,
      other: 0,
    },
    swpMonthlyNeed: defaultSWPNeed,
    swpStartAge: defaultSWPStartAge,
    swp: data.swp || {
      monthlyNeedToday: defaultSWPNeed,
      postRetirementReturn: 7.5,
      taxRate: 10,
      startAge: defaultSWPStartAge,
      endAge: defaultLifeExpectancy,
    },
    financialSummary: data.financialSummary || {
      netWorth: 0,
      investableAssets: 0,
      totalAssets: 0,
      totalLiabilities: 0,
    },
    interactions: [
      {
        id: `int-${Date.now()}`,
        clientId: id,
        date: new Date().toISOString().slice(0, 10),
        type: 'meeting',
        title: 'Initial Relationship Onboarding',
        notes: 'Opened client record. Gathered baseline household context and investment objectives.',
        nextAction: 'Complete wealth profile & draft Investment Policy Statement',
        actionCompleted: false,
        advisorName: 'SoundThesis Capital',
      },
    ],
  };

  saveCRMClient(newClient);
  setActiveCRMClient(id);
  return newClient;
}

/** Get interaction log for a specific client. */
export function getCRMInteractions(clientId: string): CRMInteraction[] {
  const client = getCRMClients().find((c) => c.id === clientId);
  if (client?.interactions && client.interactions.length > 0) {
    return client.interactions;
  }
  try {
    const raw = localStorage.getItem(`${CRM_LOGS_PREFIX}${clientId}`);
    return raw ? (JSON.parse(raw) as CRMInteraction[]) : [];
  } catch {
    return [];
  }
}

/** Add an interaction for a client. */
export function addCRMInteraction(
  clientId: string,
  entry: Omit<CRMInteraction, 'id'>,
): CRMInteraction {
  const id = `int-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const interaction: CRMInteraction = { ...entry, id, clientId };

  const clients = getCRMClients();
  const client = clients.find((c) => c.id === clientId);
  if (client) {
    const nextInteractions = [interaction, ...(client.interactions || [])];
    saveCRMClient({ ...client, interactions: nextInteractions });
  }

  try {
    const existing = getCRMInteractions(clientId);
    const updated = [interaction, ...existing.filter((i) => i.id !== id)];
    localStorage.setItem(`${CRM_LOGS_PREFIX}${clientId}`, JSON.stringify(updated));
  } catch {
    // ignore
  }

  return interaction;
}

/** Toggle task completion in an interaction. */
export function toggleCRMActionCompleted(clientId: string, interactionId: string): void {
  const clients = getCRMClients();
  const client = clients.find((c) => c.id === clientId);
  if (client && client.interactions) {
    const nextInteractions = client.interactions.map((item) =>
      item.id === interactionId ? { ...item, actionCompleted: !item.actionCompleted } : item,
    );
    saveCRMClient({ ...client, interactions: nextInteractions });
  }
}
