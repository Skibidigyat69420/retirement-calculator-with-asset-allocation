import { useState, useMemo } from 'react';
import { ShieldCheck, Shield, ArrowRight, ArrowLeft, RotateCcw, CheckCircle2, AlertTriangle, TrendingUp, Target, Activity, Wallet, BarChart2, PieChart, Clock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCalculator } from '../context/CalculatorContext';
import { RISK_QUESTIONS, calculateRiskScore, isComplete, getCategoryScores, getDimensionBreakdown, buildGlidePath, analyzeRiskGap, detectBehavioralBiases, generateActionChecklist } from '../lib/riskQuestionnaire';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatPercent } from '../lib/formatters';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];
const categoryIcons: Record<string, React.ReactNode> = {
  time: <Target size={16} />,
  tolerance: <Activity size={16} />,
  capacity: <Wallet size={16} />,
  knowledge: <BarChart2 size={16} />,
  liquidity: <TrendingUp size={16} />,
  flexibility: <ShieldCheck size={16} />,
  behavior: <Clock size={16} />,
  context: <Shield size={16} />,
};

const categoryLabels: Record<string, string> = {
  time: 'Time Horizon',
  tolerance: 'Risk Tolerance',
  capacity: 'Risk Capacity',
  knowledge: 'Knowledge & Experience',
  liquidity: 'Liquidity Needs',
  flexibility: 'Goal Flexibility',
  behavior: 'Behavioural Stability',
  context: 'Portfolio Context',
};

export const RiskQuestionnaire = () => {
  const { riskAnswers, setRiskAnswers, riskProfile, applyRiskProfileToPlan, inputs } = useCalculator();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(isComplete(riskAnswers));

  const progress = (Object.keys(riskAnswers).length / RISK_QUESTIONS.length) * 100;
  const currentQuestion = RISK_QUESTIONS[step];
  const score = useMemo(() => calculateRiskScore(riskAnswers), [riskAnswers]);
  const categoryScores = useMemo(() => getCategoryScores(riskAnswers), [riskAnswers]);
  const dimensionBreakdown = useMemo(() => getDimensionBreakdown(riskAnswers), [riskAnswers]);

  const radarData = useMemo(
    () =>
      (Object.keys(categoryLabels) as (keyof typeof categoryLabels)[]).map((dim) => ({
        dimension: categoryLabels[dim],
        score: Math.round(dimensionBreakdown[dim as keyof typeof dimensionBreakdown]?.percentage ?? 0),
      })),
    [dimensionBreakdown],
  );

  const weakestDimension = useMemo(
    () => radarData.reduce((a, b) => (b.score < a.score ? b : a), radarData[0]),
    [radarData],
  );
  const glidePath = useMemo(() => buildGlidePath(inputs.currentAge, inputs.retirementAge, riskProfile), [inputs.currentAge, inputs.retirementAge, riskProfile]);
  
  const gapAnalysis = useMemo(() => analyzeRiskGap(riskAnswers), [riskAnswers]);
  const biases = useMemo(() => detectBehavioralBiases(riskAnswers), [riskAnswers]);
  const actionChecklist = useMemo(() => generateActionChecklist(riskProfile, gapAnalysis, biases), [riskProfile, gapAnalysis, biases]);

  const handleAnswer = (scoreValue: number) => {
    setRiskAnswers((prev) => ({ ...prev, [currentQuestion.id]: scoreValue }));
    if (step < RISK_QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleApply = () => {
    applyRiskProfileToPlan();
    navigate('/allocation');
  };

  const handleReset = () => {
    setRiskAnswers({});
    setStep(0);
    setShowResults(false);
  };

  if (showResults || isComplete(riskAnswers)) {
    return (
      <div className="space-y-6">
        <SectionTitle
          title="Your Risk Profile"
          subtitle="Based on your answers, here is your recommended investment policy and how it connects to your plan."
          badge="Behavioural Finance"
        />

        {!isComplete(riskAnswers) && (
          <div className="bg-warning-soft border border-warning/40 rounded-xl p-4 flex items-start gap-3 text-warning">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Incomplete questionnaire.</strong> You have answered {Object.keys(riskAnswers).length} of {RISK_QUESTIONS.length} questions; unanswered questions score 0 and bias the profile toward conservative.{' '}
              <button
                onClick={() => {
                  const firstUnanswered = RISK_QUESTIONS.findIndex((q) => typeof riskAnswers[q.id] !== 'number');
                  setStep(firstUnanswered >= 0 ? firstUnanswered : 0);
                  setShowResults(false);
                }}
                className="underline hover:text-warning"
              >
                Resume where you left off
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 bg-sunken text-ink">
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink">Profile</div>
            <h3 className="text-3xl font-serif mt-2">{riskProfile.label}</h3>
            <p className="text-sm text-ink mt-3 leading-relaxed">{riskProfile.description}</p>

            {/* Risk score gauge */}
            <div className="mt-6 flex flex-col items-center" role="img" aria-label={`Risk score gauge: ${score} out of 100.`}>
              <svg viewBox="0 0 140 82" className="w-40">
                <path
                  d="M 14 74 A 56 56 0 0 1 126 74"
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path
                  d="M 14 74 A 56 56 0 0 1 126 74"
                  fill="none"
                  stroke="var(--color-emerald)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * Math.PI * 56} ${Math.PI * 56}`}
                />
                <text x="70" y="66" textAnchor="middle" fontSize="24" fontWeight="700" fill="#ffffff" fontFamily="var(--font-mono)">
                  {score}
                </text>
                <text x="70" y="80" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.65)" letterSpacing="1.5">
                  RISK SCORE / 100
                </text>
              </svg>
              <span className="text-[11px] text-ink-soft mt-1">
                {score >= 70 ? 'Growth-seeking band' : score >= 45 ? 'Balanced band' : score >= 25 ? 'Conservative-leaning band' : 'Capital-preservation band'}
              </span>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Risk score</span>
                <span className="font-medium">{score} / 100</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Max drawdown tolerance</span>
                <span className="font-medium">{formatPercent(riskProfile.maxDrawdown)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Target volatility</span>
                <span className="font-medium">{formatPercent(riskProfile.targetVolatility)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">Goal success threshold</span>
                <span className="font-medium">{formatPercent(riskProfile.goalSuccessThreshold)}</span>
              </div>
            </div>
            <Button className="w-full mt-6" onClick={handleApply}>
              <CheckCircle2 size={16} className="mr-2" /> Apply to Allocation
            </Button>
            <Button
              variant="outline"
              className="w-full mt-2 bg-ink/10 text-ink border-ink/20 hover:bg-ink/20"
              onClick={() => {
                setShowResults(false);
                setStep(0);
              }}
            >
              Edit Questionnaire Answers
            </Button>
            <Button variant="ghost" className="w-full mt-1 text-ink/70 hover:text-ink" onClick={handleReset}>
              <RotateCcw size={16} className="mr-2" /> Reset All Answers
            </Button>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">Recommended Strategic Allocation</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => {
                  if (riskProfile.targets[cat] <= 0) return null;
                  return (
                    <div key={cat} className="p-4 bg-sunken rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ASSET_COLORS[cat] }} />
                        <span className="text-sm font-medium text-navy">{ASSET_LABELS[cat]}</span>
                      </div>
                      <div className="text-2xl font-serif text-navy">{formatPercent(riskProfile.targets[cat])}</div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-serif text-navy">Dimension Scores</h3>
                <span className="text-xs text-ink-soft">Weighted 0–100</span>
              </div>

              {/* Dimension radar */}
              <div
                className="h-64 w-full mb-5"
                role="img"
                aria-label={`Radar chart of the eight risk dimensions. ${weakestDimension ? `Weakest dimension: ${weakestDimension.dimension} at ${weakestDimension.score} percent.` : ''}`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip
                      formatter={(value: any, name: any) => [`${Number(value)}%`, name === 'score' ? 'Dimension score' : name]}
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}
                    />
                    <Radar
                      name="score"
                      dataKey="score"
                      stroke="var(--color-accent)"
                      fill="var(--color-accent)"
                      fillOpacity={0.25}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <table className="sr-only">
                <caption>Risk dimension scores as percentages</caption>
                <thead>
                  <tr><th>Dimension</th><th>Score</th></tr>
                </thead>
                <tbody>
                  {radarData.map((d) => (
                    <tr key={d.dimension}>
                      <td>{d.dimension}</td>
                      <td>{d.score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted mb-4">
                {weakestDimension ? `${weakestDimension.dimension} is the binding constraint at ${weakestDimension.score}% — the profile cannot be more aggressive than this dimension supports.` : ''}
              </p>

              <div className="space-y-4">
                {Object.entries(categoryScores).map(([category, scorePct]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-muted">
                        {categoryIcons[category]} {categoryLabels[category] || category}
                      </span>
                      <span className="font-medium text-navy">{Math.round(scorePct)}%</span>
                    </div>
                    <div className="h-2 bg-sunken rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${scorePct}%` }}
                        className="h-full bg-sunken rounded-full"
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-sunken rounded-xl border border-border text-xs text-muted flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-muted" />
                <p>
                  Risk Tolerance (25%) and Risk Capacity (20%) carry the most weight.
                  A high-risk profile requires both the willingness to accept volatility
                  and the financial ability to recover from it.
                </p>
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Risk Gap Analysis</h3>
            <div className="mb-2 text-2xl font-serif text-navy">
              Gap: {Math.abs(gapAnalysis.gap).toFixed(1)}%
            </div>
            <p className="text-sm text-muted leading-relaxed">{gapAnalysis.verdict}</p>
          </Card>
          
          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Behavioral Biases</h3>
            {biases.length > 0 ? (
              <div className="space-y-4">
                {biases.map((b, i) => (
                  <div key={i} className="border-l-2 border-border-strong pl-3">
                    <div className="text-sm font-medium text-navy">{b.bias}</div>
                    <p className="text-xs text-muted mt-1">{b.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No significant biases detected.</p>
            )}
          </Card>
          
          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Action Checklist</h3>
            <ul className="space-y-3 text-sm text-muted">
              {actionChecklist.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <CheckCircle2 size={16} className="text-muted shrink-0 mt-0.5" />
                  <span className="leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Investor Persona</h3>
            <p className="text-muted leading-relaxed">{riskProfile.persona}</p>
            <div className="mt-4 p-4 bg-sunken rounded-xl border border-border">
              <div className="text-xs font-bold uppercase tracking-wider text-muted mb-1">Recommended Approach</div>
              <p className="text-sm text-navy">{riskProfile.recommendedApproach}</p>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Glide Path to Retirement</h3>
            <div className="h-64 w-full">
              <svg viewBox={`-30 0 ${glidePath.length * 40 + 30} 220`} className="w-full h-full" preserveAspectRatio="none">
                {[0, 25, 50, 75, 100].map(pct => (
                  <g key={pct}>
                    <text x="-5" y={200 - pct * 2} fontSize="10" fill="#78716c" textAnchor="end" alignmentBaseline="middle">{pct}%</text>
                    <line x1="0" y1={200 - pct * 2} x2={glidePath.length * 40} y2={200 - pct * 2} stroke="#e7e5e4" strokeWidth="1" strokeDasharray="4 4" />
                  </g>
                ))}
                {glidePath.map((p, i) => (
                  <g key={p.age} transform={`translate(${i * 40}, 0)`}>
                    <rect y={200 - p.equity * 2} width="30" height={p.equity * 2} fill={ASSET_COLORS.equity} opacity={0.8} rx="4" />
                    <rect y={200 - (p.equity + p.debt) * 2} width="30" height={p.debt * 2} fill={ASSET_COLORS.debt} opacity={0.8} rx="4" />
                    <text x="15" y="215" fontSize="10" fill="#78716c" textAnchor="middle">{p.age}</text>
                  </g>
                ))}
              </svg>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-ink-soft">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ASSET_COLORS.equity }} /> Equity</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ASSET_COLORS.debt }} /> Debt</span>
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4">How This Connects to Your Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-sunken rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2"><PieChart size={16} className="text-muted" /><span className="font-medium text-navy">Allocation</span></div>
              <p className="text-muted">Targets will be set to {riskProfile.label.toLowerCase()} weights and can be applied to SIP/STP splits.</p>
            </div>
            <div className="p-4 bg-sunken rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2"><BarChart2 size={16} className="text-muted" /><span className="font-medium text-navy">MVO</span></div>
              <p className="text-muted">Risk-free rate and portfolio constraints will align with your {formatPercent(riskProfile.targetVolatility)} volatility target.</p>
            </div>
            <div className="p-4 bg-sunken rounded-xl border border-border">
              <div className="flex items-center gap-2 mb-2"><Target size={16} className="text-muted" /><span className="font-medium text-navy">Goals</span></div>
              <p className="text-muted">Goal-planner success thresholds use {formatPercent(riskProfile.goalSuccessThreshold)} as the minimum acceptable probability.</p>
            </div>
          </div>
        </Card>

        <WorkflowFooter
          prev={{ path: '/', label: 'Dashboard' }}
          next={{ path: '/master-plan', label: 'Master Plan' }}
          flowHint="Risk profile establishes your strategic asset allocation targets and SIP/STP equity splits."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Risk Questionnaire"
        subtitle={`Answer ${RISK_QUESTIONS.length} questions across eight dimensions to discover your risk profile. The result drives your strategic allocation, MVO constraints, and goal success thresholds.`}
        badge="Behavioural Finance"
      />

      <Card className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-ink-soft mb-2">
            <span>Question {step + 1} of {RISK_QUESTIONS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-sunken rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-sunken rounded-full"
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Direct Question Jump Tray */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 pt-3 border-t border-border">
            {RISK_QUESTIONS.map((q, idx) => {
              const isAnswered = typeof riskAnswers[q.id] === 'number';
              const isCurrent = idx === step;
              return (
                <button
                  key={q.id}
                  onClick={() => setStep(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-focus-ring ${
                    isCurrent
                       ? 'bg-sunken text-ink shadow-2xs scale-105'
                       : isAnswered
                       ? 'bg-raised text-ink hover:bg-surface'
                       : 'bg-sunken text-muted hover:bg-raised'
                  }`}
                  title={`Question ${idx + 1}: ${q.text.slice(0, 30)}...`}
                  aria-label={`Go to question ${idx + 1}: ${q.text}`}
                  type="button"
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="gold" className="flex items-center gap-1">
                {categoryIcons[currentQuestion.dimension]}
                {categoryLabels[currentQuestion.dimension] || currentQuestion.dimension}
              </Badge>
            </div>

            <h3 className="text-xl font-serif text-navy mb-6">{currentQuestion.text}</h3>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const selected = riskAnswers[currentQuestion.id] === option.score;
                return (
                  <button
                    key={option.label}
                    onClick={() => handleAnswer(option.score)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected
                        ? 'border-border-strong bg-sunken/80 shadow-2xs'
                        : 'border-border/80 hover:border-border-strong hover:bg-sunken/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${selected ? 'text-ink font-semibold' : 'text-ink-soft'}`}>{option.label}</span>
                      {selected && <CheckCircle2 size={18} className="text-ink" />}
                    </div>
                    {option.description && (
                      <p className="text-xs text-muted mt-1">{option.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.min(RISK_QUESTIONS.length - 1, s + 1))}
              disabled={step === RISK_QUESTIONS.length - 1}
            >
              Next <ArrowRight size={16} className="ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowResults(true)}
              disabled={!Object.keys(riskAnswers).length}
            >
              Skip to Results <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="max-w-3xl mx-auto text-center text-xs text-ink-soft">
        <AlertTriangle size={14} className="inline mr-1" />
        This questionnaire is for planning purposes. It does not constitute investment advice.
      </div>
    </div>
  );
};
