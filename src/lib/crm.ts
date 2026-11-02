import type { AssetCategory } from '../types';
import type { ClientSummary } from './api';

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

const LOCAL_CLIENTS_KEY = 'stw.local-client-directory';
const ACTIVE_CLIENT_KEY = 'stw.activeClientId';
const CRM_LOGS_PREFIX = 'stw.crm.interactions.';

const SAMPLE_CLIENTS: CRMClient[] = [
  {
    id: 'sample-client-shah',
    name: 'Rhea and Karan Shah',
    status: 'Active',
    stage: 'IPS Draft',
    tier: 'HNI',
    email: 'karan.shah@example.com',
    phone: '+91 98201 44520',
    pan: 'ABCPS1234F',
    tags: ['Tech Founder', 'Retirement 2035', 'Global Assets', 'Family Trust'],
    householdId: 'household-shah',
    assignedPractitioners: [
      { userId: 'advisor-1', fullName: 'Sound Thesis Wealth Advisory', assignmentRole: 'Lead Adviser' },
    ],
    reviewDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    currentAge: 42,
    retirementAge: 58,
    lifeExpectancy: 88,
    annualIncome: 14500000,
    monthlyLivingExpenses: 450000,
    inflation: 6.5,
    primaryGoal: 'Early retirement & legacy wealth preservation',
    policyNotes: 'Retain 12 months living expenses in liquid funds. No direct speculative equities without prior IC clearance.',
    targetAllocation: {
      equity: 55,
      debt: 25,
      gold: 10,
      realestate: 5,
      liquid: 5,
      other: 0,
    },
    financialSummary: {
      netWorth: 48500000,
      investableAssets: 38200000,
      totalAssets: 52000000,
      totalLiabilities: 3500000,
      byCategory: { equity: 22000000, debt: 11000000, gold: 3500000, liquid: 1700000, realestate: 10300000 },
      assetCount: 8,
    },
    interactions: [
      {
        id: 'int-1',
        clientId: 'sample-client-shah',
        date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
        type: 'meeting',
        title: 'Initial Discovery & Risk Profiling',
        notes: 'Reviewed current balance sheet and international equity exposure. Client targets retirement at age 58 with inflation-adjusted monthly cash flow of ₹4.5L.',
        nextAction: 'Draft institutional IPS with 55% strategic equity corridor',
        actionCompleted: true,
        advisorName: 'Sound Thesis Wealth Advisory',
      },
      {
        id: 'int-2',
        clientId: 'sample-client-shah',
        date: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
        type: 'call',
        title: 'Tax Loss Harvesting & Liquid Buffer Sync',
        notes: 'Confirmed 12-month living expense reserve in high-quality liquid funds before expanding private market mandates.',
        nextAction: 'Present completed IPS for client signature and ratification',
        actionCompleted: false,
        advisorName: 'Sound Thesis Wealth Advisory',
      },
    ],
  },
  {
    id: 'sample-client-malhotra',
    name: 'Vikram & Ananya Malhotra',
    status: 'Active',
    stage: 'Discovery',
    tier: 'Ultra HNI',
    email: 'vikram.malhotra@zenithcap.in',
    phone: '+91 99300 88210',
    pan: 'AAAPM9981K',
    tags: ['Real Estate Liquidation', 'Children Education', 'NRI Compliance'],
    householdId: 'household-malhotra',
    assignedPractitioners: [
      { userId: 'advisor-1', fullName: 'Sound Thesis Wealth Advisory', assignmentRole: 'Lead Adviser' },
    ],
    reviewDate: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
    currentAge: 51,
    retirementAge: 62,
    lifeExpectancy: 90,
    annualIncome: 28000000,
    monthlyLivingExpenses: 800000,
    inflation: 6.0,
    primaryGoal: 'Global diversification & estate succession',
    policyNotes: 'Focus on multi-currency hedging and sovereign gold bonds.',
    targetAllocation: {
      equity: 50,
      debt: 35,
      gold: 10,
      realestate: 0,
      liquid: 5,
      other: 0,
    },
    financialSummary: {
      netWorth: 124000000,
      investableAssets: 95000000,
      totalAssets: 130000000,
      totalLiabilities: 6000000,
      assetCount: 14,
    },
    interactions: [
      {
        id: 'int-3',
        clientId: 'sample-client-malhotra',
        date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        type: 'meeting',
        title: 'Introductory Wealth Review',
        notes: 'Discussed portfolio restructuring following commercial property sale. Family seeks capital preservation with inflation beat.',
        nextAction: 'Complete Risk Profile Assessment and assemble master plan',
        actionCompleted: false,
        advisorName: 'Sound Thesis Wealth Advisory',
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

/** Set active client ID in localStorage and dispatch event. */
export function setActiveCRMClient(clientId: string): void {
  localStorage.setItem(ACTIVE_CLIENT_KEY, clientId);
  window.dispatchEvent(new Event('stw:active-client-changed'));
}

/** Save or update a single CRM client. */
export function saveCRMClient(client: CRMClient): void {
  const clients = getCRMClients();
  const index = clients.findIndex((c) => c.id === client.id);
  let next: CRMClient[];
  if (index >= 0) {
    next = [...clients];
    next[index] = { ...next[index], ...client };
  } else {
    next = [client, ...clients];
  }
  localStorage.setItem(LOCAL_CLIENTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('stw:clients-updated'));
}

/** Create a new CRM client. */
export function createCRMClient(data: Partial<CRMClient>): CRMClient {
  const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newClient: CRMClient = {
    id,
    name: data.name?.trim() || 'New Client Relationship',
    status: 'Active',
    stage: data.stage || 'Discovery',
    tier: data.tier || 'Affluent',
    email: data.email || '',
    phone: data.phone || '',
    pan: data.pan || '',
    tags: data.tags || ['New Relationship'],
    householdId: `hh-${id}`,
    assignedPractitioners: data.assignedPractitioners || [
      { userId: 'advisor-lead', fullName: 'Sound Thesis Wealth Advisory', assignmentRole: 'Lead Adviser' },
    ],
    reviewDate: data.reviewDate || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    currentAge: data.currentAge || 40,
    retirementAge: data.retirementAge || 60,
    lifeExpectancy: data.lifeExpectancy || 85,
    annualIncome: data.annualIncome || 0,
    monthlyLivingExpenses: data.monthlyLivingExpenses || 0,
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
        advisorName: 'Sound Thesis Wealth Advisory',
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
