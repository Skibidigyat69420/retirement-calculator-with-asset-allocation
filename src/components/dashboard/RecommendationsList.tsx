import { useState } from 'react';
import {
  HelpCircle,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { PlanRecommendation } from '../../lib/recommendationEngine';
import { useCalculator } from '../../context/CalculatorContext';

interface RecommendationsListProps {
  recommendations: PlanRecommendation[];
}

export const RecommendationsList = ({ recommendations }: RecommendationsListProps) => {
  const { inputs, updateInputs, showToast, logDecision } = useCalculator();
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({});
  const [appliedRecs, setAppliedRecs] = useState<Record<string, any>>({}); // recId -> previousState

  const toggleWhy = (id: string) => {
    setExpandedWhy((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApply = (rec: PlanRecommendation) => {
    // Record current state for undo
    const prevState: any = {};

    if (rec.actionType === 'increase_sip') {
      prevState.sip = { ...inputs.sip };
      updateInputs({
        sip: {
          ...inputs.sip,
          amount: rec.actionPayload.newSipAmount,
        },
      });
      showToast(`Applied: Monthly SIP updated to ${rec.actionPayload.newSipAmount.toLocaleString('en-IN')}`, 'success');
    } else if (rec.actionType === 'adjust_retirement_age') {
      prevState.retirementAge = inputs.retirementAge;
      updateInputs({
        retirementAge: rec.actionPayload.newRetirementAge,
      });
      showToast(`Applied: Target retirement age updated to ${rec.actionPayload.newRetirementAge}`, 'success');
    } else if (rec.actionType === 'rebalance_allocation') {
      prevState.manualTargets = null;
      showToast(`Applied: Strategic asset allocation targets rebalanced`, 'success');
    } else if (rec.actionType === 'build_emergency_reserve') {
      showToast(`Action recorded: Top up ${rec.actionPayload.topUpAmount.toLocaleString('en-IN')} in Liquid Funds`, 'info');
    }

    logDecision({
      category: (rec.category.toLowerCase() === 'retirement' ? 'retirement' : rec.category.toLowerCase() === 'portfolio' ? 'allocation' : 'cashflow') as any,
      actionTitle: rec.title,
      summary: rec.reason,
      previousValue: rec.whyExplainer.current,
      newValue: rec.whyExplainer.target,
      rationale: `${rec.whyExplainer.driver}. Benefit: ${rec.whyExplainer.benefit}`,
      author: 'Adviser',
      revertPatch: prevState,
    });

    setAppliedRecs((prev) => ({ ...prev, [rec.id]: prevState }));
  };

  const handleUndo = (rec: PlanRecommendation) => {
    const prevState = appliedRecs[rec.id];
    if (prevState) {
      updateInputs(prevState);
      setAppliedRecs((prev) => {
        const next = { ...prev };
        delete next[rec.id];
        return next;
      });
      showToast(`Undone: Plan restored to previous setting.`, 'info');
    }
  };

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 bg-white border border-zinc-200/90 shadow-2xs space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white flex items-center justify-center shrink-0">
            <CheckSquare size={15} />
          </div>
          <h3 className="text-base font-bold text-zinc-950 tracking-tight font-sans">
            Action Plan & Strategic Priorities
          </h3>
          <Badge variant="outline" className="text-[10px] uppercase font-semibold text-zinc-700">
            {recommendations.length} Action{recommendations.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <p className="text-xs text-zinc-500 hidden sm:block">
          Direct steps to close funding gaps, rebalance allocations, and protect cash reserves
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const isApplied = Boolean(appliedRecs[rec.id]);
          const isWhyOpen = Boolean(expandedWhy[rec.id]);

          let categoryBadge = <Badge variant="outline">{rec.category}</Badge>;
          if (rec.category === 'Retirement') categoryBadge = <Badge variant="navy">Retirement</Badge>;
          else if (rec.category === 'Portfolio') categoryBadge = <Badge variant="outline">Portfolio</Badge>;
          else if (rec.category === 'Liquidity') categoryBadge = <Badge variant="default">Liquidity</Badge>;

          return (
            <div
              key={rec.id}
              className={`p-4 rounded-xl border transition-all ${
                isApplied
                  ? 'bg-emerald-50/40 border-emerald-300'
                  : 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:shadow-2xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold font-mono text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                      P{rec.priority}
                    </span>
                    {categoryBadge}
                    <h4 className="text-sm font-bold text-zinc-950">{rec.title}</h4>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {rec.confidence >= 90 ? 'High Impact' : 'Priority'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">{rec.reason}</p>
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-emerald-700" />
                    {rec.impact}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWhy(rec.id)}
                    className="text-[11px] h-7 px-2.5 text-zinc-700 border-zinc-200 hover:bg-zinc-100 gap-1 rounded-lg"
                  >
                    <HelpCircle size={12} />
                    {isWhyOpen ? 'Hide Rationale' : 'View Rationale'}
                  </Button>

                  {isApplied ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndo(rec)}
                      className="text-[11px] h-7 px-2.5 text-zinc-700 border-zinc-300 hover:bg-zinc-100 gap-1 rounded-lg"
                    >
                      <RotateCcw size={12} />
                      Undo
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApply(rec)}
                      className="text-[11px] h-7 px-3 bg-zinc-950 text-white hover:bg-zinc-800 font-semibold gap-1.5 rounded-lg shadow-2xs"
                    >
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      {rec.actionLabel}
                    </Button>
                  )}
                </div>
              </div>

              {/* Rationale Drawer */}
              {isWhyOpen && (
                <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-50 border border-zinc-200/80 p-3.5 rounded-xl text-xs animate-in fade-in duration-150">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Current Status</span>
                    <span className="font-semibold text-zinc-900">{rec.whyExplainer.current}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Target Benchmark</span>
                    <span className="font-semibold text-zinc-950">{rec.whyExplainer.target}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Quantitative Driver</span>
                    <span className="text-zinc-700 leading-snug">{rec.whyExplainer.driver}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-0.5">Expected Benefit</span>
                    <span className="font-semibold text-emerald-700 leading-snug">{rec.whyExplainer.benefit}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

