import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Button } from '../components/ui/Button';
import {
  Users, 
  Clock, 
  FolderOpen,
  Calendar,
  AlertTriangle,
  PieChart,
  CheckCircle2
} from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    clients: 0,
    activePlans: 0,
    reviewsDue: 8,
    plansAtRisk: 11
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/clients', {
          headers: { 'x-organization-slug': 'sound-thesis' }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(prev => ({ ...prev, clients: data.data.length, activePlans: data.data.length * 1.5 /* mock */ }));
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-slate-100">
            Good morning, Ketan.
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Here's what needs your attention.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/clients')} className="gap-2">
            <FolderOpen size={16} /> New Plan
          </Button>
          <Button onClick={() => navigate('/clients')} className="gap-2">
            <Users size={16} /> New Client
          </Button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-slate-400">Clients</span>
            <Users size={18} className="text-slate-500" />
          </div>
          <div className="text-3xl font-light text-slate-100">{loading ? '-' : stats.clients}</div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-slate-400">Active Plans</span>
            <FolderOpen size={18} className="text-slate-500" />
          </div>
          <div className="text-3xl font-light text-slate-100">{loading ? '-' : Math.round(stats.activePlans)}</div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-slate-400">Reviews Due</span>
            <Calendar size={18} className="text-amber-500" />
          </div>
          <div className="text-3xl font-light text-amber-400">{stats.reviewsDue}</div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-slate-400">Plans at Risk</span>
            <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <div className="text-3xl font-light text-rose-400">{stats.plansAtRisk}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Planning Health & Work Queue */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-6">
            <SectionTitle title="Your Practice Health" />
            <div className="mt-6 flex flex-col md:flex-row gap-8 items-center">
              <div className="relative w-48 h-48 flex-shrink-0 flex items-center justify-center">
                {/* Visual donut representation - hardcoded for mockup as per spec */}
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="20" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="72.84" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="198.44" style={{ transformOrigin: 'center', transform: 'rotate(255.6deg)' }} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="231.10" style={{ transformOrigin: 'center', transform: 'rotate(331.2deg)' }} />
                </svg>
                <div className="absolute text-center">
                  <div className="text-3xl font-light text-slate-100">105</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Plans</div>
                </div>
              </div>
              <div className="flex-1 space-y-4 w-full">
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 border border-transparent hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="font-medium text-slate-200">Healthy</span>
                  </div>
                  <span className="font-mono text-emerald-400">71%</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 border border-transparent hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="font-medium text-slate-200">Review Required</span>
                  </div>
                  <span className="font-mono text-amber-400">21%</span>
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 border border-transparent hover:border-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="font-medium text-slate-200">At Risk</span>
                  </div>
                  <span className="font-mono text-rose-400">8%</span>
                </button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle title="Today's Work Queue" />
            <div className="mt-4 divide-y divide-slate-800">
              <div className="py-4 flex items-center justify-between hover:bg-slate-800/30 -mx-6 px-6 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-900/30 text-amber-500 flex items-center justify-center">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-medium">9 upcoming reviews</h4>
                    <p className="text-sm text-slate-400">Prepare plan updates and rebalancing reports.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Action</Button>
              </div>
              <div className="py-4 flex items-center justify-between hover:bg-slate-800/30 -mx-6 px-6 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-900/30 text-blue-500 flex items-center justify-center">
                    <PieChart size={18} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-medium">3 plan updates</h4>
                    <p className="text-sm text-slate-400">Asset allocation drifted beyond limits.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Action</Button>
              </div>
              <div className="py-4 flex items-center justify-between hover:bg-slate-800/30 -mx-6 px-6 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-900/30 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h4 className="text-slate-200 font-medium">2 reports awaiting approval</h4>
                    <p className="text-sm text-slate-400">Final executive dossier review.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Action</Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Reviews & Activity */}
        <div className="space-y-8">
          <Card className="p-6">
            <SectionTitle title="Upcoming Reviews" />
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-900/50 text-brand-400 flex items-center justify-center text-xs font-bold">
                    RS
                  </div>
                  <span className="font-medium text-slate-200">Raj Sharma</span>
                </div>
                <span className="text-sm font-medium text-amber-500">Tomorrow</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-900/50 text-brand-400 flex items-center justify-center text-xs font-bold">
                    AM
                  </div>
                  <span className="font-medium text-slate-200">Anita Mehta</span>
                </div>
                <span className="text-sm font-medium text-slate-400">Friday</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-900/50 text-brand-400 flex items-center justify-center text-xs font-bold">
                    VS
                  </div>
                  <span className="font-medium text-slate-200">Vivek Shah</span>
                </div>
                <span className="text-sm font-medium text-slate-500">15 Sep</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle title="Practice Activity" />
            <div className="mt-6 relative pl-6 border-l border-slate-800 space-y-6">
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface border-2 border-brand-500"></div>
                <p className="text-sm text-slate-200">
                  <span className="font-medium text-white">Ketan</span> updated Raj Sharma's plan
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <Clock size={12} /> 2h ago
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface border-2 border-emerald-500"></div>
                <p className="text-sm text-slate-200">
                  <span className="font-medium text-white">Aarav</span> created a scenario for Anita Mehta
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <Clock size={12} /> 4h ago
                </div>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface border-2 border-blue-500"></div>
                <p className="text-sm text-slate-200">
                  <span className="font-medium text-white">Meera</span> uploaded a document for Vivek Shah
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                  <Clock size={12} /> Yesterday
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};
