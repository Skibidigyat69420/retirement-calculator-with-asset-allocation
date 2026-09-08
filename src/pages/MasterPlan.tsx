import { useSearchParams } from 'react-router-dom';
import {
  User,
  Building2,
  TrendingUp,
  Target,
  BarChart2,
  Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProfileStep } from '../components/master-plan/ProfileStep';
import { FinancialsStep } from '../components/master-plan/FinancialsStep';
import { CashflowsStep } from '../components/master-plan/CashflowsStep';
import { GoalsStep } from '../components/master-plan/GoalsStep';
import { RiskStep } from '../components/master-plan/RiskStep';
import { ResultsStep } from '../components/master-plan/ResultsStep';
import { MasterPlanSidebar } from '../components/master-plan/MasterPlanSidebar';

const STEPS = [
  { id: 'profile', label: 'Profile', icon: <User size={16} /> },
  { id: 'financials', label: 'Financials', icon: <Building2 size={16} /> },
  { id: 'cashflows', label: 'Cashflows', icon: <TrendingUp size={16} /> },
  { id: 'goals', label: 'Goals', icon: <Target size={16} /> },
  { id: 'risk', label: 'Risk', icon: <Activity size={16} /> },
  { id: 'results', label: 'Results', icon: <BarChart2 size={16} /> },
];

export const MasterPlan = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get('step') || 'profile';
  
  const currentStepIndex = STEPS.findIndex((s) => s.id === stepParam);
  const activeStepId = currentStepIndex >= 0 ? stepParam : 'profile';
  const activeStepIdx = currentStepIndex >= 0 ? currentStepIndex : 0;

  const goToStep = (stepId: string) => {
    setSearchParams({ step: stepId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (activeStepIdx < STEPS.length - 1) {
      goToStep(STEPS[activeStepIdx + 1].id);
    }
  };

  const handleBack = () => {
    if (activeStepIdx > 0) {
      goToStep(STEPS[activeStepIdx - 1].id);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-background">
      {/* Left Navigation Rail */}
      <div className="w-full lg:w-64 shrink-0 border-r border-border bg-surface p-4 hidden lg:block sticky top-0 h-screen overflow-y-auto">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-4 px-2">Master Plan Steps</h2>
        <nav className="space-y-1">
          {STEPS.map((step, idx) => {
            const isActive = step.id === activeStepId;
            const isCompleted = idx < activeStepIdx;
            
            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  isActive 
                    ? 'bg-ink text-surface shadow-md' 
                    : isCompleted
                      ? 'text-ink hover:bg-sunken'
                      : 'text-muted hover:text-ink hover:bg-sunken'
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg",
                  isActive ? "bg-surface/20 text-surface" : "bg-sunken text-ink"
                )}>
                  {step.icon}
                </div>
                <span>{step.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Step Indicator */}
      <div className="lg:hidden p-4 border-b border-border bg-surface sticky top-0 z-10 overflow-x-auto">
         <div className="flex items-center gap-2 min-w-max">
            {STEPS.map((step) => {
              const isActive = step.id === activeStepId;
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors',
                    isActive ? 'bg-ink text-surface' : 'bg-sunken text-muted'
                  )}
                >
                  {step.icon} {step.label}
                </button>
              );
            })}
         </div>
      </div>

      {/* Center Editor Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
          {activeStepId === 'profile' && <ProfileStep onNext={handleNext} />}
          {activeStepId === 'financials' && <FinancialsStep onNext={handleNext} />}
          {activeStepId === 'cashflows' && <CashflowsStep onNext={handleNext} onBack={handleBack} />}
          {activeStepId === 'goals' && <GoalsStep onNext={handleNext} onBack={handleBack} />}
          {activeStepId === 'risk' && <RiskStep onNext={handleNext} onBack={handleBack} />}
          {activeStepId === 'results' && <ResultsStep onBack={handleBack} />}
        </div>
      </div>

      {/* Right Persistent Summary (Only on large screens) */}
      <div className="w-80 shrink-0 border-l border-border bg-surface p-4 hidden xl:block sticky top-0 h-screen overflow-y-auto shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
        <MasterPlanSidebar />
      </div>
    </div>
  );
};
