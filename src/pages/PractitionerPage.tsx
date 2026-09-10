import { useState, useEffect, useCallback } from 'react';
import {
  LogOut,
  Play,
  Download,
  RefreshCw,
  AlertTriangle,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ApiRequestError,
  listClients,
  listPlans,
  calculatePlan,
  exportClientBundle,
  type ClientSummary,
  type PlanSummary,
  type CalculationResult,
} from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { SectionTitle } from '../components/ui/SectionTitle';
import { formatCurrencyCompact } from '../lib/formatters';
import { cn } from '../lib/utils';

export function PractitionerPage() {
  const { ready, user, memberships, organizationId, organizationName, login, logout, selectOrganization } =
    useAuth();

  const [email, setEmail] = useState('you@soundthesis.local');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // Dev convenience: skip the sign-in form entirely in the dev server by
  // automatically establishing the demo practitioner session. Inert in
  // production builds; manual login still appears if auto-login fails or
  // after an explicit logout (logout does not reset the attempted flag).
  useEffect(() => {
    if (!import.meta.env.DEV || !ready || user || autoLoginAttempted) return;
    setAutoLoginAttempted(true);
    setLoggingIn(true);
    login(import.meta.env.VITE_DEV_LOGIN_EMAIL ?? 'adviser@soundthesis.local').catch(
      (error: unknown) => {
        setAuthError(
          error instanceof ApiRequestError
            ? `${error.code}: ${error.message}`
            : 'Auto sign-in failed — sign in manually below.',
        );
      },
    ).finally(() => setLoggingIn(false));
  }, [ready, user, autoLoginAttempted, login]);

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    setClientsError(null);
    try {
      const response = await listClients();
      setClients(response.data);
    } catch (error) {
      setClientsError(error instanceof ApiRequestError ? error.message : 'Failed to load clients.');
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    if (user && organizationId) {
      setSelectedClientId(null);
      setPlans([]);
      setCalculation(null);
      loadClients();
    }
  }, [user, organizationId, loadClients]);

  useEffect(() => {
    if (!selectedClientId || !organizationId) return;
    setPlans([]);
    setCalculation(null);
    setPlansError(null);
    listPlans(selectedClientId)
      .then((response) => setPlans(response.data))
      .catch((error) =>
        setPlansError(error instanceof ApiRequestError ? error.message : 'Failed to load plans.'),
      );
  }, [selectedClientId, organizationId]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoggingIn(true);
    setAuthError(null);
    try {
      await login(email.trim());
    } catch (error) {
      setAuthError(
        error instanceof ApiRequestError ? `${error.code}: ${error.message}` : 'Login failed.',
      );
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCalculate = async (planId: string) => {
    setCalculating(true);
    setCalcError(null);
    setCalculation(null);
    try {
      const response = await calculatePlan(planId);
      setCalculation(response.result);
    } catch (error) {
      setCalcError(error instanceof ApiRequestError ? error.message : 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const handleExport = async (client: ClientSummary) => {
    try {
      await exportClientBundle(client.id, client.name);
    } catch (error) {
      setClientsError(error instanceof ApiRequestError ? error.message : 'Export failed.');
    }
  };

  if (!ready) {
    return <div className="p-6 text-sm text-zinc-500">Restoring session…</div>;
  }

  // ------------------------------------------------------------- login
  if (!user) {
    if (loggingIn && !authError) {
      return <div className="p-6 text-sm text-zinc-500">Signing you in…</div>;
    }
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card variant="navy">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-zinc-800 border border-zinc-700">
              <Landmark size={20} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Practitioner Sign In</h1>
              <p className="text-xs text-zinc-400">Backend API session (dev mode)</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="practitioner-email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Email
              </label>
              <input
                id="practitioner-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/60"
                placeholder="you@soundthesis.local"
              />
            </div>
            {authError && (
              <Alert variant="danger" icon={AlertTriangle}>
                {authError}
              </Alert>
            )}
            <Button type="submit" disabled={loggingIn} className="w-full">
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
            Requires the backend running (<code className="text-zinc-400">cd server &amp;&amp; npm run dev</code>
            , seeded with <code className="text-zinc-400">npm run db:seed</code>). In dev mode any seeded
            email mints a session token.
          </p>
        </Card>
      </div>
    );
  }

  // ------------------------------------------------------- org picker
  if (!organizationId) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card>
          <SectionTitle title="Choose an organization" subtitle={`Signed in as ${user.fullName ?? user.email}`} />
          <div className="space-y-2 mt-4">
            {memberships.map((membership) => (
              <button
                key={membership.organizationId}
                onClick={() => selectOrganization(membership.organizationId)}
                className="w-full flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm hover:border-zinc-950 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                <span className="font-semibold">{membership.organizationName}</span>
                <Badge variant="outline" dot={false}>{membership.role}</Badge>
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="mt-4">
            <LogOut size={14} /> Sign out
          </Button>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------- workspace
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle
          title={organizationName ?? 'Practice'}
          subtitle={`${user.fullName ?? user.email} · live data from the practitioner backend`}
        />
        <div className="flex items-center gap-2">
          {memberships.length > 1 && (
            <select
              value={organizationId}
              onChange={(event) => selectOrganization(event.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold cursor-pointer"
            >
              {memberships.map((membership) => (
                <option key={membership.organizationId} value={membership.organizationId}>
                  {membership.organizationName}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" size="sm" onClick={loadClients} disabled={loadingClients}>
            <RefreshCw size={14} className={cn(loadingClients && 'animate-spin')} /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={14} /> Sign out
          </Button>
        </div>
      </div>

      {clientsError && (
        <Alert variant="danger" icon={AlertTriangle}>
          {clientsError}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ------------------------------------------------ client list */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-bold mb-3">Clients</h3>
          {loadingClients && clients.length === 0 ? (
            <p className="text-sm text-zinc-500">Loading clients…</p>
          ) : clients.length === 0 ? (
            <p className="text-sm text-zinc-500">No clients in this organization yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {clients.map((client) => (
                <li key={client.id}>
                  <button
                    onClick={() => setSelectedClientId(client.id)}
                    className={cn(
                      'w-full text-left px-3 py-3 rounded-xl transition-colors cursor-pointer',
                      selectedClientId === client.id ? 'bg-zinc-950 text-white' : 'hover:bg-zinc-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{client.name}</span>
                      <Badge variant={client.status === 'active' ? 'success' : 'default'} dot={false}>
                        {client.status}
                      </Badge>
                    </div>
                    <div
                      className={cn(
                        'text-xs mt-1',
                        selectedClientId === client.id ? 'text-zinc-300' : 'text-zinc-500',
                      )}
                    >
                      Net worth {formatCurrencyCompact(client.financialSummary.netWorth)} · Investable{' '}
                      {formatCurrencyCompact(client.financialSummary.investableAssets)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ------------------------------------------- client workspace */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedClient ? (
            <Card>
              <p className="text-sm text-zinc-500">Select a client to view plans and run calculations.</p>
            </Card>
          ) : (
            <>
              <Card variant="navy">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold">{selectedClient.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Net worth {formatCurrencyCompact(selectedClient.financialSummary.netWorth)} ·
                      Liabilities {formatCurrencyCompact(selectedClient.financialSummary.totalLiabilities)}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => handleExport(selectedClient)}>
                    <Download size={14} /> Export JSON
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="text-sm font-bold mb-3">Plans</h3>
                {plansError && (
                  <Alert variant="danger" icon={AlertTriangle}>
                    {plansError}
                  </Alert>
                )}
                {plans.length === 0 && !plansError ? (
                  <p className="text-sm text-zinc-500">No plans for this client yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {plans.map((plan) => (
                      <li
                        key={plan.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3"
                      >
                        <div>
                          <span className="text-sm font-semibold">{plan.name}</span>
                          <Badge variant="outline" dot={false} className="ml-2">
                            {plan.status}
                          </Badge>
                        </div>
                        <Button size="sm" onClick={() => handleCalculate(plan.id)} disabled={calculating}>
                          <Play size={14} /> {calculating ? 'Calculating…' : 'Calculate'}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {calcError && (
                <Alert variant="danger" icon={AlertTriangle}>
                  {calcError}
                </Alert>
              )}

              {calculation && (
                <Card variant="gold">
                  <h3 className="text-sm font-bold mb-4">Calculation result</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(
                      [
                        ['Required corpus', calculation.requiredCorpus],
                        ['Projected corpus', calculation.projectedCorpus],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                        <p className="text-lg font-bold mt-1">
                          {typeof value === 'number' ? formatCurrencyCompact(value) : '—'}
                        </p>
                      </div>
                    ))}
                    {(
                      [
                        ['Funding ratio', calculation.fundingRatio, 2],
                        ['Probability of success', calculation.probabilityOfSuccess, 0, true],
                      ] as const
                    ).map(([label, value, digits, isPercent]) => (
                      <div key={label}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                        <p className="text-lg font-bold mt-1">
                          {typeof value === 'number'
                            ? `${(value * (isPercent ? 100 : 1)).toFixed(digits)}${isPercent ? '%' : '×'}`
                            : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
