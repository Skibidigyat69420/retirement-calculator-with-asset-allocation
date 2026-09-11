import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertTriangle,
  Calculator,
  Download,
  FileJson,
  Landmark,
  LogOut,
  Play,
  RefreshCw,
  Users,
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
import { PageHeader } from '../components/ui/PageHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { FinancialMetric } from '../components/ui/FinancialMetric';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { formatCurrencyCompact } from '../lib/formatters';
import { guardNumber } from '../lib/planState';
import { cn } from '../lib/utils';

interface ActivityItem {
  id: number;
  text: string;
  at: number;
}

let activitySeq = 0;

export function PractitionerPage() {
  const { ready, user, memberships, organizationId, organizationName, login, logout, selectOrganization } =
    useAuth();

  const [email, setEmail] = useState('you@soundthesis.local');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const pushActivity = useCallback((text: string) => {
    setActivity((prev) => [{ id: ++activitySeq, text, at: Date.now() }, ...prev].slice(0, 6));
  }, []);

  // Dev convenience: skip the sign-in form entirely in the dev server by
  // automatically establishing the demo practitioner session. Inert in
  // production builds; manual login still appears if auto-login fails or
  // after an explicit logout (logout does not reset the attempted flag).
  useEffect(() => {
    if (!import.meta.env.DEV || !ready || user || autoLoginAttempted) return;
    // eslint-disable-next-line react/set-state-in-effect -- synchronous guard flags must be set before the async login fires, or StrictMode re-runs the effect and double-mints a session.
    setAutoLoginAttempted(true);
    // eslint-disable-next-line react/set-state-in-effect -- the signing-in state is only correct if it renders before the login promise settles.
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

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    setClientsError(null);
    try {
      const response = await listClients();
      setClients(response.data);
      pushActivity(`Practice data refreshed — ${response.data.length} client${response.data.length === 1 ? '' : 's'} loaded.`);
    } catch (error) {
      setClientsError(error instanceof ApiRequestError ? error.message : 'Failed to load clients.');
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, [pushActivity]);

  // Reset the selection synchronously during render when the practice scope
  // changes (render-phase adjustment, per the React docs), then load clients.
  const [prevScope, setPrevScope] = useState<{ u: unknown; o: string | null }>({ u: user, o: organizationId });
  if (prevScope.u !== user || prevScope.o !== organizationId) {
    setPrevScope({ u: user, o: organizationId });
    setSelectedClientId(null);
    setPlans([]);
    setCalculation(null);
  }

  useEffect(() => {
    if (user && organizationId) {
      loadClients();
    }
  }, [user, organizationId, loadClients]);

  // Reset plan workspace synchronously during render when the selected client
  // changes; the effect below only fetches plans for the current selection.
  const [prevClientId, setPrevClientId] = useState<string | null>(selectedClientId);
  if (prevClientId !== selectedClientId) {
    setPrevClientId(selectedClientId);
    setPlans([]);
    setCalculation(null);
    setPlansError(null);
  }

  useEffect(() => {
    if (!selectedClientId || !organizationId) return;
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

  const handleCalculate = async (planId: string, planName: string, clientName: string) => {
    setCalculating(true);
    setCalcError(null);
    setCalculation(null);
    try {
      const response = await calculatePlan(planId);
      setCalculation(response.result);
      pushActivity(`Calculated “${planName}” for ${clientName}.`);
    } catch (error) {
      setCalcError(error instanceof ApiRequestError ? error.message : 'Calculation failed.');
    } finally {
      setCalculating(false);
    }
  };

  const handleExport = async (client: ClientSummary) => {
    try {
      await exportClientBundle(client.id, client.name);
      pushActivity(`Exported the client bundle for ${client.name}.`);
    } catch (error) {
      setClientsError(error instanceof ApiRequestError ? error.message : 'Export failed.');
    }
  };

  // ------------------------------------------------------- derived practice data
  const team = useMemo(() => {
    const map = new Map<string, { name: string; role: string; clientCount: number }>();
    clients.forEach((client) =>
      (client.assignedPractitioners ?? []).forEach((p) => {
        const existing = map.get(p.userId) ?? {
          name: p.fullName ?? 'Wealth practitioner',
          role: p.assignmentRole,
          clientCount: 0,
        };
        existing.clientCount += 1;
        map.set(p.userId, existing);
      }),
    );
    if (map.size === 0 && user) {
      map.set('self', {
        name: user.fullName ?? user.email,
        role: 'Lead wealth practitioner',
        clientCount: clients.length,
      });
    }
    return [...map.entries()].map(([id, member]) => ({ id, ...member }));
  }, [clients, user]);

  const pulse = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active').length;
    const netWorth = clients.reduce((s, c) => s + (guardNumber(c.financialSummary.netWorth) ?? 0), 0);
    const investable = clients.reduce((s, c) => s + (guardNumber(c.financialSummary.investableAssets) ?? 0), 0);
    const reviewLoad = clients.length - active;
    return { active, netWorth, investable, reviewLoad };
  }, [clients]);

  if (!ready) {
    return (
      <div className="py-16 flex justify-center">
        <p className="text-sm text-muted">Restoring session…</p>
      </div>
    );
  }

  // ------------------------------------------------------------- login
  if (!user) {
    if (loggingIn && !authError) {
      return (
        <div className="py-16 flex justify-center">
          <p className="text-sm text-muted">Signing you in…</p>
        </div>
      );
    }
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="rounded-lg border border-border bg-raised shadow-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-md bg-deep text-canvas">
              <Landmark size={18} strokeWidth={1.6} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink">Practitioner sign in</h1>
              <p className="text-xs text-muted">Backend API session (dev mode)</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              id="practitioner-email"
              type="email"
              required
              label="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@soundthesis.local"
            />
            {authError && (
              <Alert variant="danger" icon={AlertTriangle}>
                {authError}
              </Alert>
            )}
            <Button type="submit" disabled={loggingIn} className="w-full">
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-[11px] leading-relaxed text-faint">
            Requires the backend running (<code className="font-mono text-muted">cd server &amp;&amp; npm run dev</code>
            , seeded with <code className="font-mono text-muted">npm run db:seed</code>). In dev mode any seeded
            email mints a session token.
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------- org picker
  if (!organizationId) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="rounded-lg border border-border bg-raised shadow-card p-6">
          <PageHeader variant="compact" title="Choose an organization" description={`Signed in as ${user.fullName ?? user.email}`} />
          <div className="space-y-2 mt-2">
            {memberships.map((membership) => (
              <button
                key={membership.organizationId}
                onClick={() => selectOrganization(membership.organizationId)}
                className="w-full flex items-center justify-between rounded-md border border-border bg-surface px-4 py-3 text-sm hover:border-border-strong transition-colors cursor-pointer"
              >
                <span className="font-medium text-ink">{membership.organizationName}</span>
                <StatusBadge status={membership.role === 'owner' ? 'active' : 'in-progress'} />
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="mt-4">
            <LogOut size={14} strokeWidth={1.6} /> Sign out
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------- workspace
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;

  const skeletonRows = [0, 1, 2, 3];

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        eyebrow="Practice"
        title={organizationName ?? 'Your practice'}
        description={`${user.fullName ?? user.email} · live data from the practitioner backend`}
        actions={
          <>
            {memberships.length > 1 && (
              <select
                value={organizationId}
                onChange={(event) => selectOrganization(event.target.value)}
                className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-ink cursor-pointer hover:border-border-strong transition-colors"
              >
                {memberships.map((membership) => (
                  <option key={membership.organizationId} value={membership.organizationId}>
                    {membership.organizationName}
                  </option>
                ))}
              </select>
            )}
            <Button variant="outline" size="sm" onClick={loadClients} disabled={loadingClients}>
              <RefreshCw size={13} strokeWidth={1.6} className={cn(loadingClients && 'animate-spin')} /> Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut size={13} strokeWidth={1.6} /> Sign out
            </Button>
          </>
        }
      />

      {clientsError && clients.length > 0 && (
        <Alert variant="danger" icon={AlertTriangle}>
          {clientsError}
        </Alert>
      )}

      {clientsError && clients.length === 0 && !loadingClients ? (
        <EmptyState
          eyebrow="Practice"
          title="We couldn't load practice data."
          description={clientsError}
          icon={AlertTriangle}
          action={
            <Button size="sm" onClick={loadClients}>
              <RefreshCw size={13} strokeWidth={1.6} /> Retry
            </Button>
          }
        />
      ) : (
        <>
          {/* Practice pulse */}
          <section className="rounded-lg border border-border bg-raised shadow-card px-5 md:px-6 py-5">
            {loadingClients && clients.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                {skeletonRows.map((i) => (
                  <div key={i} className="space-y-2.5">
                    <div className="h-2.5 w-20 rounded bg-sunken animate-shimmer" />
                    <div className="h-6 w-24 rounded bg-sunken animate-shimmer" />
                    <div className="h-2.5 w-28 rounded bg-sunken animate-shimmer" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                <FinancialMetric label="Clients" value={clients.length} hint="In this practice" size="md" />
                <FinancialMetric label="Active engagements" value={pulse.active} hint={`${pulse.reviewLoad} awaiting review`} size="md" />
                <FinancialMetric label="Combined net worth" value={pulse.netWorth > 0 ? formatCurrencyCompact(pulse.netWorth) : null} hint="Across all clients" size="md" />
                <FinancialMetric label="Investable assets" value={pulse.investable > 0 ? formatCurrencyCompact(pulse.investable) : null} hint="Across all clients" size="md" />
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Client assignments */}
            <section className="lg:col-span-2 rounded-lg border border-border bg-raised shadow-card">
              <div className="px-5 md:px-6 pt-5">
                <SectionHeader
                  title="Client assignments"
                  description="Households under management in this practice."
                />
              </div>
              {loadingClients && clients.length === 0 ? (
                <div className="px-5 md:px-6 pb-5 space-y-2.5">
                  {skeletonRows.map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-sunken animate-shimmer" />
                      <div className="flex-1 h-9 rounded-md bg-sunken animate-shimmer" />
                    </div>
                  ))}
                </div>
              ) : clients.length === 0 ? (
                <p className="px-5 md:px-6 pb-5 text-sm text-muted">No clients in this practice yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-y border-border text-left">
                        <th className="px-5 md:px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Client</th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Status</th>
                        <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted text-right">Net worth</th>
                        <th className="px-5 md:px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted text-right">Investable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          onClick={() => setSelectedClientId(client.id)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            selectedClientId === client.id ? 'bg-accent-softer' : 'hover:bg-sunken/60',
                          )}
                        >
                          <td className="px-5 md:px-6 py-3 font-medium text-ink whitespace-nowrap">{client.name}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={client.status === 'active' ? 'active' : 'needs-review'} />
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-ink-soft whitespace-nowrap">
                            {formatCurrencyCompact(client.financialSummary.netWorth)}
                          </td>
                          <td className="px-5 md:px-6 py-3 text-right font-mono tabular-nums text-ink-soft whitespace-nowrap">
                            {formatCurrencyCompact(client.financialSummary.investableAssets)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Selected client workspace */}
              {selectedClient && (
                <div className="border-t border-border px-5 md:px-6 py-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="eyebrow">Selected client</div>
                      <h3 className="mt-0.5 text-base font-semibold tracking-tight text-ink">{selectedClient.name}</h3>
                      <p className="mt-0.5 text-xs text-muted">
                        Net worth {formatCurrencyCompact(selectedClient.financialSummary.netWorth)} · Liabilities{' '}
                        {formatCurrencyCompact(selectedClient.financialSummary.totalLiabilities)}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => handleExport(selectedClient)}>
                      <FileJson size={13} strokeWidth={1.6} /> Export bundle
                    </Button>
                  </div>

                  {plansError && (
                    <Alert variant="danger" icon={AlertTriangle}>
                      {plansError}
                    </Alert>
                  )}

                  {plans.length === 0 && !plansError ? (
                    <p className="text-sm text-muted">No plans for this client yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {plans.map((plan) => (
                        <li
                          key={plan.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm font-medium text-ink truncate">{plan.name}</span>
                            <StatusBadge status={plan.status === 'active' ? 'active' : plan.status === 'draft' ? 'draft' : 'in-progress'} />
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleCalculate(plan.id, plan.name, selectedClient.name)} disabled={calculating}>
                            <Play size={13} strokeWidth={1.6} /> {calculating ? 'Calculating…' : 'Calculate'}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {calcError && (
                    <Alert variant="danger" icon={AlertTriangle}>
                      {calcError}
                    </Alert>
                  )}

                  {calculation && (
                    <div className="rounded-md border border-brass/30 bg-brass-soft p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Calculator size={14} strokeWidth={1.6} className="text-brass-strong" aria-hidden="true" />
                        <h4 className="text-[13px] font-semibold tracking-tight text-ink">Calculation result</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                        <FinancialMetric
                          label="Required corpus"
                          value={guardNumber(calculation.requiredCorpus)}
                          prefix="₹"
                          size="sm"
                        />
                        <FinancialMetric
                          label="Projected corpus"
                          value={guardNumber(calculation.projectedCorpus)}
                          prefix="₹"
                          size="sm"
                        />
                        <FinancialMetric
                          label="Funding ratio"
                          value={
                            guardNumber(calculation.fundingRatio) !== null
                              ? `${((calculation.fundingRatio as number) * 100).toFixed(1)}%`
                              : null
                          }
                          size="sm"
                        />
                        <FinancialMetric
                          label="Success probability"
                          value={
                            guardNumber(calculation.probabilityOfSuccess) !== null
                              ? `${((calculation.probabilityOfSuccess as number) * 100).toFixed(0)}%`
                              : null
                          }
                          size="sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Team + activity */}
            <div className="space-y-6">
              <section className="rounded-lg border border-border bg-raised shadow-card p-5">
                <SectionHeader title="Team" description="Wealth practitioners assigned to this practice." />
                <ul className="space-y-3">
                  {team.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
                      <Avatar name={member.name} id={member.id} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink truncate">{member.name}</p>
                        <p className="text-[11px] text-muted">{member.role}</p>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-faint shrink-0">
                        {member.clientCount} {member.clientCount === 1 ? 'client' : 'clients'}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-lg border border-border bg-raised shadow-card p-5">
                <SectionHeader
                  title="Recent activity"
                  description="Latest actions in this workspace."
                  action={
                    <span className="flex items-center gap-1.5 text-faint" aria-hidden="true">
                      <Users size={13} strokeWidth={1.6} />
                    </span>
                  }
                />
                {activity.length === 0 ? (
                  <p className="text-xs text-faint">Run a calculation or refresh the practice to begin the feed.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {activity.map((item) => (
                      <li key={item.id} className="flex items-start gap-2.5">
                        <Download size={12} strokeWidth={1.6} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-xs text-ink-soft leading-relaxed">{item.text}</p>
                          <p className="font-mono text-[10px] tabular-nums text-faint">
                            {new Date(item.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
