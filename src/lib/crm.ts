import type { AssetCategory, ManualAllocationPolicy, MasterPlanInputs, RiskAnswers } from '../types';
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

const LOCAL_CLIENTS_KEY = 'stw.local-client-directory.v3';
const ACTIVE_CLIENT_KEY = 'stw.activeClientId';
const CRM_LOGS_PREFIX = 'stw.crm.interactions.';

const SAMPLE_CLIENTS: CRMClient[] = [
  {
    id: 'sample-household',
    name: 'Sample Household',
    status: 'Sample',
    stage: 'Discovery',
    tier: 'Affluent',
    email: 'sample.household@example.com',
    phone: '+91 98450 12345',
    pan: 'AABCS9912D',
    tags: ['Sample Household', 'Moderate Allocation', 'Dual Earner', 'Multi-Goal'],
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
    primaryGoal: 'Retirement at 60 & balanced education funding',
    policyNotes: 'Moderate 50/35/10/5 balanced allocation. Systematic monthly SIP of ₹35,000 with modest annual step-up.',
    targetAllocation: {
      equity: 50,
      debt: 35,
      gold: 10,
      realestate: 0,
      liquid: 5,
      other: 0,
    },
    financialSummary: {
      netWorth: 6900000,
      investableAssets: 4500000,
      totalAssets: 9900000,
      totalLiabilities: 3000000,
      byCategory: { equity: 2000000, debt: 1650000, gold: 500000, liquid: 400000, realestate: 5350000 },
      assetCount: 18,
    },
    interactions: [
      {
        id: 'sample-int-1',
        clientId: 'sample-household',
        date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
        type: 'meeting',
        title: 'Initial Discovery & Risk Profiling',
        notes: 'Reviewed middle-income household balance sheet. Moderate living expenses of ₹75k/mo against ₹24L annual gross income. Established a balanced 50% equity allocation with a 6% annual SIP step-up.',
        nextAction: 'Finalize master plan and review glide path',
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
      { userId: 'advisor-lead', fullName: 'SoundThesis Capital', assignmentRole: 'Lead Adviser' },
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
