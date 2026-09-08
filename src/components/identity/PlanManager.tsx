import { useState } from 'react';
import { Save, FolderOpen, Trash2 } from 'lucide-react';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const PlanManager = () => {
  const {
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

  return (
    <div className="p-4 bg-surface rounded-xl border border-border/90 shadow-2xs space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <FolderOpen size={16} className="text-muted" />
        <span>Saved Plans ({savedPlans.length})</span>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Plan name (e.g. Early Retirement 2035)"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="flex-1 text-xs"
        />
        <Button variant="primary" size="sm" onClick={handleSave} disabled={busy}>
          <Save size={14} className="mr-1" /> Save
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Local Plans</span>
          <button
            onClick={() => refreshSavedPlans()}
            className="text-xs text-muted hover:text-ink hover:underline"
            disabled={busy}
          >
            Refresh
          </button>
        </div>

        {savedPlans.length === 0 ? (
          <p className="text-xs text-muted italic">No saved plans yet. Name and save your current configuration above.</p>
        ) : (
          <ul className="space-y-2">
            {savedPlans.map((plan) => (
              <li
                key={plan.id}
                className="flex items-center justify-between p-2.5 bg-sunken rounded-lg border border-border"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-sm font-medium text-ink-soft truncate">{plan.name}</p>
                  <p className="text-[10px] text-muted">
                    {new Date(plan.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => handleLoad(plan.id)} disabled={busy} title="Load plan">
                    <FolderOpen size={14} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(plan.id)} disabled={busy} title="Delete plan" className="text-negative hover:text-negative">
                    <Trash2 size={14} />
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
