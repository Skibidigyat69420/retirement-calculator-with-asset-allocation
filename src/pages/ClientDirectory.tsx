import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Users, Plus, ChevronRight } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Button } from '../components/ui/Button';

// Quick types for this component
interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export const ClientDirectory = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useCalculator();
  const navigate = useNavigate();

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', {
        headers: { 'x-organization-slug': 'sound-thesis' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch clients');
      setClients(data.data || []);
    } catch (err: any) {
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-organization-slug': 'sound-thesis'
        },
        body: JSON.stringify({ firstName, lastName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create client');
      
      showToast('Client created successfully', 'success');
      fetchClients();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-slate-100 flex items-center gap-3">
            <Users className="text-brand-400" size={32} />
            Client Directory
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Manage your practice and client wealth plans.</p>
        </div>
      </header>

      {error && (
        <div className="bg-rose-900/50 border border-rose-800 text-rose-200 p-4 rounded-xl">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <SectionTitle title="All Clients" />
          {loading ? (
            <Card className="p-12 flex justify-center text-slate-400">Loading clients...</Card>
          ) : clients.length === 0 ? (
            <Card className="p-12 flex flex-col items-center justify-center text-slate-400 gap-4">
              <Users size={48} className="text-slate-600" />
              <p>No clients found. Create your first client.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.map(client => (
                <Card key={client.id} className="p-5 hover:border-brand-500/50 transition-colors group cursor-pointer" onClick={() => navigate(`/clients/${client.id}`)}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-brand-400 font-medium">
                        {client.first_name[0]}{client.last_name[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-200 group-hover:text-brand-300 transition-colors">
                          {client.first_name} {client.last_name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          Joined {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-slate-600 group-hover:text-brand-400 transition-colors" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="p-6">
            <SectionTitle title="New Client Onboarding" />
            <form onSubmit={handleCreateClient} className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">First Name</label>
                <input 
                  type="text" 
                  name="firstName" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
                <input 
                  type="text" 
                  name="lastName" 
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <Button type="submit" className="w-full flex items-center justify-center gap-2">
                <Plus size={18} />
                Create Client Profile
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
