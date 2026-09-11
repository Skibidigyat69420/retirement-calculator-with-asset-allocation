/**
 * Thin typed client for the wealth-practitioner backend (server/).
 *
 * Same-origin by default: in dev, vite proxies /api/v1 → http://localhost:4000
 * (see vite.config.ts). Set VITE_API_BASE_URL to point at a remote backend.
 *
 * Auth state (bearer token + organization context) lives in module-level
 * variables set by the AuthContext on login/logout; every request carries
 * `authorization` and `x-organization-id` headers.
 */

const BASE: string =
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_BASE_URL as string | undefined)) ||
  '/api/v1';

let authToken: string | null = null;
let organizationId: string | null = null;

export function setAuthContext(token: string | null, orgId: string | null): void {
  authToken = token;
  organizationId = orgId;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (authToken) headers['authorization'] = `Bearer ${authToken}`;
  if (organizationId) headers['x-organization-id'] = organizationId;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiRequestError(
      'BACKEND_UNREACHABLE',
      'Could not reach the practitioner backend. Is the API server running?',
      0,
    );
  }

  if (!res.ok) {
    let code = 'UNKNOWN';
    let message = `Request failed with status ${res.status}.`;
    try {
      const envelope = await res.json();
      if (envelope?.error?.code) code = envelope.error.code;
      if (envelope?.error?.message) message = envelope.error.message;
    } catch {
      // non-JSON error body — keep the status-based message
    }
    throw new ApiRequestError(code, message, res.status);
  }

  return (await res.json()) as T;
}

// ---------------------------------------------------------------- shapes

export interface Membership {
  organizationId: string;
  organizationName: string;
  role: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface DevLoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: SessionUser;
  memberships: Membership[];
}

export interface ClientSummary {
  id: string;
  name: string;
  status: string;
  householdId: string;
  assignedPractitioners: { userId: string; fullName: string | null; assignmentRole: string }[];
  financialSummary: {
    netWorth: number;
    investableAssets: number;
    totalAssets: number;
    totalLiabilities: number;
  };
}

export interface ClientRecord extends ClientSummary {
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  notes: string | null;
}

export interface FinancialProfileResponse {
  assets: Record<string, unknown>[];
  liabilities: Record<string, unknown>[];
  cashflows: Record<string, unknown>[];
  goals: Record<string, unknown>[];
  netWorth: number;
  totals: Record<string, number>;
}

export interface PlanRecord extends PlanSummary {
  currentVersionId: string | null;
  currentVersion: {
    id: string;
    versionNumber: number;
    inputSnapshot: Record<string, unknown>;
    assumptionsSnapshot: Record<string, unknown>;
  } | null;
}

export interface PlanSummary {
  id: string;
  clientId: string;
  name: string;
  status: string;
}

export interface CalculationResult {
  requiredCorpus?: number;
  projectedCorpus?: number;
  fundingRatio?: number;
  probabilityOfSuccess?: number;
  [key: string]: unknown;
}

export interface CalculateResponse {
  result: CalculationResult;
  baseScenarioRecalculated: boolean;
}

// ------------------------------------------------------------- endpoints

export function devLogin(email: string): Promise<DevLoginResponse> {
  return request<DevLoginResponse>('/auth/dev-login', { method: 'POST', body: { email } });
}

export function listClients(): Promise<{ data: ClientSummary[] }> {
  return request<{ data: ClientSummary[] }>('/clients');
}

export function getClient(clientId: string): Promise<ClientRecord> {
  return request<ClientRecord>(`/clients/${clientId}`);
}

export function getClientProfile(clientId: string): Promise<FinancialProfileResponse> {
  return request<FinancialProfileResponse>(`/clients/${clientId}/profile`);
}

export function patchClient(clientId: string, body: Record<string, unknown>): Promise<ClientRecord> {
  return request<ClientRecord>(`/clients/${clientId}`, { method: 'PATCH', body });
}

export function getPlan(planId: string): Promise<PlanRecord> {
  return request<PlanRecord>(`/plans/${planId}`);
}

export function createPlanVersion(planId: string, inputSnapshot: Record<string, unknown>, assumptionsSnapshot: Record<string, unknown> = {}): Promise<unknown> {
  return request(`/plans/${planId}/versions`, { method: 'POST', body: { inputSnapshot, assumptionsSnapshot, changeSummary: 'Workspace inputs updated' } });
}

export type FinancialResource = 'assets' | 'liabilities' | 'cashflows' | 'goals';

export function createFinancialResource(clientId: string, resource: FinancialResource, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/clients/${clientId}/${resource}`, { method: 'POST', body });
}

export function patchFinancialResource(clientId: string, resource: FinancialResource, id: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/clients/${clientId}/${resource}/${id}`, { method: 'PATCH', body });
}

export function archiveFinancialResource(clientId: string, resource: 'assets' | 'liabilities', id: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/clients/${clientId}/${resource}/${id}/archive`, { method: 'POST' });
}

export function listPlans(clientId: string): Promise<{ data: PlanSummary[] }> {
  return request<{ data: PlanSummary[] }>(`/clients/${clientId}/plans`);
}

export function calculatePlan(planId: string): Promise<CalculateResponse> {
  return request<CalculateResponse>(`/plans/${planId}/calculate`, { method: 'POST', body: {} });
}

/** Authenticated JSON export — returns a Blob ready for download. */
export async function exportClientBundle(clientId: string, clientName: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (authToken) headers['authorization'] = `Bearer ${authToken}`;
  if (organizationId) headers['x-organization-id'] = organizationId;

  const res = await fetch(`${BASE}/clients/${clientId}/export?format=json`, { headers });
  if (!res.ok) {
    throw new ApiRequestError('EXPORT_FAILED', `Export failed with status ${res.status}.`, res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${clientName.replace(/\s+/g, '-').toLowerCase()}-export.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
