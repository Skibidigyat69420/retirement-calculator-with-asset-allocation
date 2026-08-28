import { useState, useMemo } from 'react';
import { ShieldCheck, ArrowRight, ArrowLeft, RotateCcw, CheckCircle2, AlertTriangle, TrendingUp, Target, Activity, Wallet, BarChart2, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCalculator } from '../context/CalculatorContext';
import { RISK_QUESTIONS, calculateRiskScore, isComplete, getCategoryScores, buildGlidePath } from '../lib/riskQuestionnaire';
import { ASSET_COLORS, ASSET_LABELS } from '../lib/constants';
import { formatPercent } from '../lib/formatters';
import type { AssetCategory } from '../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];
const categoryIcons: Record<string, React.ReactNode> = {
  time: <Target size={16} />,
  capacity: <Wallet size={16} />,
  attitude: <Activity size={16} />,
  experience: <BarChart2 size={16} />,
  liquidity: <TrendingUp size={16} />,
  goals: <ShieldCheck size={16} />,
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
  const glidePath = useMemo(() => buildGlidePath(inputs.currentAge, inputs.retirementAge, riskProfile), [inputs.currentAge, inputs.retirementAge, riskProfile]);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 bg-navy text-white">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gold">Profile</div>
            <div className="text-3xl font-serif mt-2">{riskProfile.label}</div>
            <p className="text-sm text-stone-200 mt-3 leading-relaxed">{riskProfile.description}</p>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-stone-300">Risk score</span>
                <span className="font-medium">{score} / {Math.max(...RISK_QUESTIONS.map((q) => Math.max(...q.options.map((o) => o.score)))) * RISK_QUESTIONS.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-300">Max drawdown tolerance</span>
                <span className="font-medium">{formatPercent(riskProfile.maxDrawdown)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-300">Target volatility</span>
                <span className="font-medium">{formatPercent(riskProfile.targetVolatility)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-300">Goal success threshold</span>
                <span className="font-medium">{formatPercent(riskProfile.goalSuccessThreshold)}</span>
              </div>
            </div>
            <Button className="w-full mt-6" onClick={handleApply}>
              <CheckCircle2 size={16} className="mr-2" /> Apply to Allocation
            </Button>
            <Button variant="ghost" className="w-full mt-2 text-white/70 hover:text-white" onClick={handleReset}>
              <RotateCcw size={16} className="mr-2" /> Retake Questionnaire
            </Button>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-lg font-serif text-navy mb-4">Recommended Strategic Allocation</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => {
                  if (riskProfile.targets[cat] <= 0) return null;
                  return (
                    <div key={cat} className="p-4 bg-stone-50 rounded-xl border border-stone-100">
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
              <h3 className="text-lg font-serif text-navy mb-4">Dimension Scores</h3>
              <div className="space-y-4">
                {Object.entries(categoryScores).map(([category, scorePct]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-stone-600 capitalize">
                        {categoryIcons[category]} {category}
                      </span>
                      <span className="font-medium text-navy">{Math.round(scorePct)}%</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${scorePct}%` }}
                        className="h-full bg-gold rounded-full"
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Investor Persona</h3>
            <p className="text-stone-600 leading-relaxed">{riskProfile.persona}</p>
            <div className="mt-4 p-4 bg-gold/10 rounded-xl border border-gold/20">
              <div className="text-xs font-bold uppercase tracking-wider text-gold mb-1">Recommended Approach</div>
              <p className="text-sm text-navy">{riskProfile.recommendedApproach}</p>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Glide Path to Retirement</h3>
            <div className="h-64 w-full">
              <svg viewBox={`0 0 ${glidePath.length * 40} 200`} className="w-full h-full" preserveAspectRatio="none">
                {glidePath.map((p, i) => (
                  <g key={p.age} transform={`translate(${i * 40}, 0)`}>
                    <rect y={200 - p.equity * 2} width="35" height={p.equity * 2} fill={ASSET_COLORS.equity} opacity={0.8} rx="4" />
                    <rect y={200 - (p.equity + p.debt) * 2} width="35" height={p.debt * 2} fill={ASSET_COLORS.debt} opacity={0.8} rx="4" />
                  </g>
                ))}
              </svg>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-stone-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ASSET_COLORS.equity }} /> Equity</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: ASSET_COLORS.debt }} /> Debt</span>
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-serif text-navy mb-4">How This Connects to Your Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div className="flex items-center gap-2 mb-2"><PieChart size={16} className="text-gold" /><span className="font-medium text-navy">Allocation</span></div>
              <p className="text-stone-600">Targets will be set to {riskProfile.label.toLowerCase()} weights and can be applied to SIP/STP splits.</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div className="flex items-center gap-2 mb-2"><BarChart2 size={16} className="text-gold" /><span className="font-medium text-navy">MVO</span></div>
              <p className="text-stone-600">Risk-free rate and portfolio constraints will align with your {formatPercent(riskProfile.targetVolatility)} volatility target.</p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <div className="flex items-center gap-2 mb-2"><Target size={16} className="text-gold" /><span className="font-medium text-navy">Goals</span></div>
              <p className="text-stone-600">Goal-planner success thresholds use {formatPercent(riskProfile.goalSuccessThreshold)} as the minimum acceptable probability.</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Risk Questionnaire"
        subtitle="Answer 8 questions to discover your risk profile. The result will drive your strategic allocation, MVO constraints, and goal success thresholds."
        badge="Behavioural Finance"
      />

      <Card className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span>Question {step + 1} of {RISK_QUESTIONS.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gold rounded-full"
              transition={{ duration: 0.3 }}
            />
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
                {categoryIcons[currentQuestion.category]}
                {currentQuestion.category}
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
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-gold bg-gold/5'
                        : 'border-stone-100 hover:border-gold/50 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${selected ? 'text-navy' : 'text-stone-700'}`}>{option.label}</span>
                      {selected && <CheckCircle2 size={18} className="text-gold" />}
                    </div>
                    {option.description && (
                      <p className="text-xs text-stone-500 mt-1">{option.description}</p>
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
          <Button
            variant="outline"
            onClick={() => setShowResults(true)}
            disabled={!Object.keys(riskAnswers).length}
          >
            Skip to Results <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </Card>

      <div className="max-w-3xl mx-auto text-center text-xs text-stone-500">
        <AlertTriangle size={14} className="inline mr-1" />
        This questionnaire is for planning purposes. It does not constitute investment advice.
      </div>
    </div>
  );
};
