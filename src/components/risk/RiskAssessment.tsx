import type { Dispatch, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { ProgressBar } from '../ui/ProgressBar';
import { SectionHeader } from '../ui/SectionHeader';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import {
  RISK_QUESTIONS,
  isComplete,
  type RiskAnswers,
  type RiskQuestion,
} from '../../lib/riskQuestionnaire';
import { RISK_GROUPS, DIMENSION_LABELS, type LogDecisionFn } from './assessmentGroups';

interface RiskAssessmentProps {
  riskAnswers: RiskAnswers;
  setRiskAnswers: Dispatch<SetStateAction<RiskAnswers>>;
  onLogDecision: LogDecisionFn;
  onViewReport: () => void;
}

/**
 * Grouped questionnaire. Every question renders as clean answer rows on a
 * quiet plane; the selected answer takes a moss soft fill with a left rule.
 * No score is shown while answering — only progress.
 */
export const RiskAssessment = ({
  riskAnswers,
  setRiskAnswers,
  onLogDecision,
  onViewReport,
}: RiskAssessmentProps) => {
  const answeredCount = Object.keys(riskAnswers).length;
  const complete = isComplete(riskAnswers);

  const handleSelect = (question: RiskQuestion, optionLabel: string, score: number) => {
    const previous = riskAnswers[question.id];
    const wasComplete = isComplete(riskAnswers);

    setRiskAnswers((prev) => ({ ...prev, [question.id]: score }));

    // Editing an answer on an already-completed profile is a decision — log it.
    if (wasComplete && typeof previous === 'number' && previous !== score) {
      const previousLabel =
        question.options.find((o) => o.score === previous)?.label ?? String(previous);
      onLogDecision({
        category: 'risk',
        actionTitle: `Revised ${DIMENSION_LABELS[question.dimension]} response`,
        summary: `Risk assessment answer changed for: "${question.text}"`,
        previousValue: previousLabel,
        newValue: optionLabel,
        rationale:
          'Questionnaire answer updated after the risk profile was completed; the assessment report reflects the revised input.',
        author: 'Advisor',
      });
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-raised border border-border rounded-lg p-4 sm:p-5">
        <ProgressBar
          value={answeredCount}
          max={RISK_QUESTIONS.length}
          label="Assessment progress"
          showValue
        />
        {complete && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-4 pt-4 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-sm text-positive">
              <ShieldCheck size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>Assessment complete — the profile report is ready.</span>
            </div>
            <Button size="sm" onClick={onViewReport}>
              View report <ArrowRight size={14} strokeWidth={1.7} className="ml-1" aria-hidden="true" />
            </Button>
          </motion.div>
        )}
      </div>

      {RISK_GROUPS.map((group, groupIndex) => (
        <motion.section
          key={group.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: groupIndex * 0.04 }}
        >
          <SectionHeader
            title={`${group.index}. ${group.title}`}
            description={group.description}
            hairline
          />

          <div className="space-y-8 mt-5">
            {RISK_QUESTIONS.filter((q) => group.dimensions.includes(q.dimension)).map(
              (question) => {
                const selected = riskAnswers[question.id];
                return (
                  <fieldset key={question.id} className="min-w-0">
                    <legend className="sr-only">{question.text}</legend>
                    <div className="flex items-baseline justify-between gap-4 mb-2.5">
                      <div className="eyebrow">{DIMENSION_LABELS[question.dimension]}</div>
                      {typeof selected === 'number' && (
                        <Badge tone="accent" dot={false}>
                          Answered
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-[15px] font-medium text-ink tracking-tight text-pretty max-w-2xl">
                      {question.text}
                    </h3>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      {question.options.map((option) => {
                        const isSelected = selected === option.score;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => handleSelect(question, option.label, option.score)}
                            className={cn(
                              'w-full text-left rounded-md border px-4 py-3 transition-colors duration-150 cursor-pointer',
                              isSelected
                                ? 'bg-accent-soft border-accent/40 shadow-[inset_2px_0_0_var(--color-accent)]'
                                : 'bg-raised border-border hover:border-border-strong hover:bg-surface',
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className={cn(
                                  'text-sm leading-snug',
                                  isSelected ? 'font-medium text-ink' : 'text-ink-soft',
                                )}
                              >
                                {option.label}
                              </span>
                              {isSelected && (
                                <Check
                                  size={15}
                                  strokeWidth={1.8}
                                  className="shrink-0 text-accent"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            {option.description && (
                              <p className="text-xs text-muted mt-1 leading-relaxed">
                                {option.description}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              },
            )}
          </div>
        </motion.section>
      ))}

      <p className="text-xs text-faint leading-relaxed border-t border-border-subtle pt-4">
        This questionnaire is for planning purposes. It does not constitute investment advice.
        Answers are stored with the workspace and can be revised at any time; revisions to a
        completed profile are recorded in the decision log.
      </p>
    </div>
  );
};
