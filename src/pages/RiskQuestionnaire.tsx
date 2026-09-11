import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, Compass, Scale, Wallet } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useCalculator } from '../context/CalculatorContext';
import { isComplete } from '../lib/riskQuestionnaire';
import { RiskAssessment } from '../components/risk/RiskAssessment';
import { RiskReport } from '../components/risk/RiskReport';
import { RISK_GROUPS } from '../components/risk/assessmentGroups';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

type RiskMode = 'intro' | 'assessment' | 'report';

/**
 * Risk assessment page. Three modes:
 *  - intro:       no answers yet — an invitation, never a score.
 *  - assessment:  the grouped questionnaire (partial answers resume here).
 *  - report:      the assessment report — only once every question is answered.
 */
export const RiskQuestionnaire = () => {
  const {
    riskAnswers,
    setRiskAnswers,
    riskProfile,
    applyRiskProfileToPlan,
    inputs,
    hasRiskAnswers,
    logDecision,
  } = useCalculator();
  const navigate = useNavigate();
  const complete = isComplete(riskAnswers);

  const [mode, setMode] = useState<RiskMode>(() =>
    complete ? 'report' : hasRiskAnswers ? 'assessment' : 'intro',
  );

  // The report must never render from an incomplete questionnaire.
  const effectiveMode: RiskMode = mode === 'report' && !complete ? 'assessment' : mode;

  const handleApply = () => {
    applyRiskProfileToPlan();
    navigate('/allocation');
  };

  const handleReset = () => {
    setRiskAnswers({});
    setMode('intro');
  };

  if (effectiveMode === 'intro') {
    return (
      <div className="space-y-6 pb-8">
        <PageHeader
          eyebrow="Risk Assessment"
          title="Risk Profile"
          variant="hero"
          description="The risk profile anchors the strategic asset allocation, MVO constraints and goal success thresholds. It is established through a structured questionnaire — never assumed."
        />

        <EmptyState
          display
          icon={ClipboardList}
          eyebrow="No assessment yet"
          title="No assessment yet"
          description="Answer the questionnaire to establish the client's risk profile — fourteen questions across eight dimensions, grouped by ability, attitude and experience."
          action={
            <Button size="lg" onClick={() => setMode('assessment')}>
              Begin assessment
              <ArrowRight size={16} strokeWidth={1.7} className="ml-2" aria-hidden="true" />
            </Button>
          }
        />

        <section className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
          {[
            { icon: Wallet, group: RISK_GROUPS[0] },
            { icon: Scale, group: RISK_GROUPS[1] },
            { icon: Compass, group: RISK_GROUPS[2] },
          ].map(({ icon: Icon, group }) => (
            <div key={group.id} className="py-5 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} strokeWidth={1.7} className="text-accent" aria-hidden="true" />
                <span className="eyebrow">
                  {group.index}. {group.title}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">{group.description}</p>
            </div>
          ))}
        </section>

        <p className="text-xs text-faint leading-relaxed">
          This questionnaire is for planning purposes. It does not constitute investment advice.
        </p>
      </div>
    );
  }

  if (effectiveMode === 'assessment') {
    return (
      <div className="space-y-6 pb-8">
        <PageHeader
          eyebrow="Risk Assessment"
          title="Risk Questionnaire"
          description="Fourteen questions across eight dimensions. Answers persist with the workspace; a completed profile feeds the strategic allocation, MVO constraints and goal success thresholds."
          actions={
            <Button
              variant="outline"
              disabled={!complete}
              onClick={() => setMode('report')}
              title={complete ? undefined : 'Answer every question to view the report'}
            >
              View report
              <ArrowRight size={15} strokeWidth={1.7} className="ml-1.5" aria-hidden="true" />
            </Button>
          }
        />

        <RiskAssessment
          riskAnswers={riskAnswers}
          setRiskAnswers={setRiskAnswers}
          onLogDecision={logDecision}
          onViewReport={() => setMode('report')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div className="eyebrow">Risk Profile · Assessment Report</div>
        <div className="text-xs text-faint font-mono tabular-nums">
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <RiskReport
        riskAnswers={riskAnswers}
        riskProfile={riskProfile}
        inputs={inputs}
        onApply={handleApply}
        onEdit={() => setMode('assessment')}
        onReset={handleReset}
      />

      <WorkflowFooter
        prev={{ path: '/', label: 'Dashboard' }}
        next={{ path: '/master-plan', label: 'Master Plan' }}
        flowHint="Risk profile establishes your strategic asset allocation targets and SIP/STP equity splits."
      />
    </div>
  );
};
