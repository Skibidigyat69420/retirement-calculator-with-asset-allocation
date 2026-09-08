import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { ArrowLeft, FileText, Plus, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useCalculator } from '../context/CalculatorContext';
import { defaultClientInputs } from '../lib/scenarios';
import type { MasterPlanInputs } from '../types';

export const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast, setInputs } = useCalculator();
  
  const [client, setClient] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientData = async () => {
    try {
      // Get Client Profile
      const clientRes = await fetch(`/api/clients/${id}`, {
        headers: { 'x-organization-slug': 'sound-thesis' }
      });
      if (!clientRes.ok) throw new Error('Client not found');
      const clientData = await clientRes.json();
      setClient(clientData.data);

      // Get Client Plans
      const plansRes = await fetch(`/api/clients/${id}/plans`, {
        headers: { 'x-organization-slug': 'sound-thesis' }
      });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.data || []);
      }
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleCreatePlan = async () => {
    try {
      const inputs = defaultClientInputs();
      inputs.client.name = `${client.first_name} ${client.last_name}`;
      
      const payload = {
        clientId: id,
        name: 'Initial Plan',
        engineVersion: '1.0.0',
        inputSnapshot: inputs,
        assumptionsSnapshot: {}, // Needs to be loaded from defaults ideally
        manualTargetsSnapshot: null,
        riskAnswersSnapshot: {}
      };

      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-slug': 'sound-thesis'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create plan');
      
      showToast('Plan created!', 'success');
      fetchClientData();
      
      // Load this plan into the context and navigate to dashboard
      // Note: for a full integration, you would set ActivePlanId, but for now we just mutate context
      setInputs(data.data.input_snapshot as MasterPlanInputs);
      navigate('/');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenPlan = (plan: any) => {
    if (plan.input_snapshot) {
      setInputs(plan.input_snapshot as MasterPlanInputs);
      showToast(`Loaded plan v${plan.version_number}`, 'success');
      navigate('/');
    } else {
      showToast('Plan has no inputs', 'error');
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading client...</div>;
  if (error) return <div className="p-12 text-center text-rose-400">Error: {error}</div>;
  if (!client) return null;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <button 
        onClick={() => navigate('/clients')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Directory
      </button>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-light text-slate-100 flex items-center gap-3">
            <User className="text-brand-400" size={32} />
            {client.first_name} {client.last_name}
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Client Profile & Plans</p>
        </div>
        <Button onClick={handleCreatePlan} className="flex items-center gap-2">
          <Plus size={18} />
          New Master Plan
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="p-6">
            <SectionTitle title="Client Details" />
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-slate-500">First Name</div>
                <div className="text-slate-200">{client.first_name}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Last Name</div>
                <div className="text-slate-200">{client.last_name}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Joined</div>
                <div className="text-slate-200">{new Date(client.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </Card>
        </div>
        
        <div className="md:col-span-2 space-y-4">
          <SectionTitle title="Wealth Plans" />
          {plans.length === 0 ? (
            <Card className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4 border-dashed">
              <FileText size={48} className="text-slate-600" />
              <p>No plans yet. Create one to get started.</p>
              <Button onClick={handleCreatePlan} variant="outline" className="mt-2">
                Create First Plan
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {plans.map((plan: any) => (
                <Card key={plan.id} className="p-5 hover:border-brand-500/50 transition-colors group">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-slate-200 group-hover:text-brand-300">
                        {plan.name || `Plan v${plan.version_number}`}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Last updated: {new Date(plan.created_at).toLocaleString()} • Engine {plan.engine_version}
                      </p>
                    </div>
                    <Button onClick={() => handleOpenPlan(plan)}>
                      Open Plan
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
