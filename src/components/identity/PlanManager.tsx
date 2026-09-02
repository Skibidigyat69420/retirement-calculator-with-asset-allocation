import { useState } from 'react';
import { Save, FolderOpen, Trash2, Cloud, CloudOff } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const PlanManager = () => {
  const {
    identity,
    savedPlans,
    saveCurrentPlan,
    loadSavedPlan,
    deleteSavedPlan,
    refreshSavedPlans,
  } = useCalculator();
  const [planName, setPlanName] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    await saveCurrentPlan(planName.trim() || undefined);
    setPlanName('');
    setBusy(false);
  };

  const handleLoad = async (id: string) => {
    setBusy(true);
    await loadSavedPlan(id);
    setBusy(false);
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    await deleteSavedPlan(id);
    setBusy(false);
  };

  if (!identity.isReady) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600">
        Loading cloud sync…
      </div>
    );
  }

  if (!identity.user) {
    return (
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
        <CloudOff size={18} className="text-slate-500 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-600">
          <p className="font-medium text-slate-800">Cloud saves</p>
          <p className="mt-1">Log in or sign up from the top bar to save plans to the cloud and access them across devices.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Cloud size={16} className="text-navy" /> Cloud Plans
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Plan name"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="flex-1"
        />
        <Button variant="primary" size="sm" onClick={handleSave} disabled={busy}>
          <Save size={14} className="mr-1" /> Save
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Saved plans</span>
          <button
            onClick={refreshSavedPlans}
            className="text-xs text-navy hover:underline"
            disabled={busy}
          >
            Refresh
          </button>
        </div>

        {savedPlans.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No cloud plans yet.</p>
        ) : (
          <ul className="space-y-2">
            {savedPlans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{plan.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(plan.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleLoad(plan.id)} disabled={busy}>
                    <FolderOpen size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)} disabled={busy}>
                    <Trash2 size={14} className="text-rose-600" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
