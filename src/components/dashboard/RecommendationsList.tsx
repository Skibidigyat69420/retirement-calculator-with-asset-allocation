import { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  TrendingUp,
  RotateCcw,
  Zap,
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
  const { inputs, updateInputs, showToast } = useCalculator();
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
    <Card className="p-6 border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Central Decision & Action Engine
          </h3>
          <Badge variant="navy" className="text-[10px] uppercase font-semibold">
            {recommendations.length} Recommended Action{recommendations.length > 1 ? 's' : ''}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 hidden sm:block">
          Algorithmic multi-factor optimization across retirement, liquidity, and risk
        </p>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const isApplied = Boolean(appliedRecs[rec.id]);
          const isWhyOpen = Boolean(expandedWhy[rec.id]);

          let categoryBadge = <Badge variant="navy">{rec.category}</Badge>;
          if (rec.category === 'Retirement') categoryBadge = <Badge variant="gold">Retirement</Badge>;
          else if (rec.category === 'Portfolio') categoryBadge = <Badge variant="success">Portfolio</Badge>;
          else if (rec.category === 'Liquidity') categoryBadge = <Badge variant="navy">Liquidity</Badge>;

          return (
            <div
              key={rec.id}
              className={`p-4 rounded-xl border transition-all ${
                isApplied
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-white border-slate-200/80 hover:border-indigo-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold font-mono text-slate-400">
                      P{rec.priority}
                    </span>
                    {categoryBadge}
                    <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {rec.confidence}% Confidence
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>
                  <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {rec.impact}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleWhy(rec.id)}
                    className="text-[11px] h-7 px-2 text-slate-600 gap-1"
                  >
                    <HelpCircle size={12} />
                    {isWhyOpen ? 'Hide Why' : 'Why?'}
                  </Button>

                  {isApplied ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndo(rec)}
                      className="text-[11px] h-7 px-2.5 text-slate-600 border-slate-300 gap-1"
                    >
                      <RotateCcw size={12} />
                      Undo
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApply(rec)}
                      className="text-[11px] h-7 px-3 bg-slate-900 text-white hover:bg-slate-800 gap-1 shadow-xs"
                    >
                      <Sparkles size={12} />
                      {rec.actionLabel}
                    </Button>
                  )}
                </div>
              </div>

              {/* "Why?" Explainability Drawer */}
              {isWhyOpen && (
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg text-xs animate-in fade-in duration-150">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Status</span>
                    <span className="font-semibold text-slate-800">{rec.whyExplainer.current}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Threshold</span>
                    <span className="font-semibold text-indigo-700">{rec.whyExplainer.target}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Quantitative Driver</span>
                    <span className="text-slate-700 leading-snug">{rec.whyExplainer.driver}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Long-Term Benefit</span>
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
