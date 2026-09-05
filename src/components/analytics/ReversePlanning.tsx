import { useState, useMemo, useEffect } from 'react';
import {
  Compass,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { CurrencyInput } from '../ui/CurrencyInput';
import { runReversePlanning } from '../../lib/reversePlanning';
import { useCalculator } from '../../context/CalculatorContext';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import type { ReversePathway } from '../../types';

export const ReversePlanning = () => {
  const {
    inputs,
    wealthResult,
    updateInputs,
    updateSIP,
    updateSWP,
    showToast,
    logDecision,
  } = useCalculator();

  const currentWealth = wealthResult.netWorth > 0 ? wealthResult.netWorth : 15000000;
  const initialTargetCorpus = Math.max(
    50000000,
    Math.round(((wealthResult.terminalValue || currentWealth * 2.5) * 1.15) / 1000000) * 1000000,
  );

  const [targetCorpus, setTargetCorpus] = useState<number>(initialTargetCorpus);
  const [targetAge, setTargetAge] = useState<number>(Math.max(inputs.currentAge + 1, inputs.retirementAge));
  const [appliedPathway, setAppliedPathway] = useState<string | null>(null);

  // Synchronize target age when inputs.retirementAge updates from external components
  useEffect(() => {
    setTargetAge((prev) => (prev === inputs.retirementAge ? prev : Math.max(inputs.currentAge + 1, inputs.retirementAge)));
  }, [inputs.retirementAge, inputs.currentAge]);

  const handleTargetAgeChange = (newAge: number) => {
    const validAge = Math.max(inputs.currentAge + 1, Math.min(newAge, inputs.lifeExpectancy - 1));
    setTargetAge(validAge);
    // Immediately write back to CalculatorContext so the entire plan updates in real-time
    updateInputs({ retirementAge: validAge });
  };

  const result = useMemo(() => {
    return runReversePlanning(inputs, wealthResult, {
      targetCorpus,
      targetAge,
    });
  }, [inputs, wealthResult, targetCorpus, targetAge]);

  // Solver Action 1: Apply Required Monthly SIP
  const handleApplyRequiredSip = () => {
    updateSIP({ amount: result.requiredMonthlySip });
    logDecision({
      category: 'sip',
      actionTitle: `Applied Required SIP: ${formatCurrency(result.requiredMonthlySip)}/mo`,
      summary: `Adjusted monthly SIP from ${formatCurrency(inputs.sip.amount)} to ${formatCurrency(result.requiredMonthlySip)} to fund ${formatCurrencyCompact(targetCorpus)} milestone.`,
      previousValue: `${formatCurrency(inputs.sip.amount)}/mo`,
      newValue: `${formatCurrency(result.requiredMonthlySip)}/mo`,
      rationale: `Solved monthly contribution required to achieve ${formatCurrencyCompact(targetCorpus)} by age ${targetAge} at ${inputs.sip.stepUp}% annual step-up.`,
      author: 'Adviser',
      revertPatch: { sip: { ...inputs.sip } },
    });
    showToast(`Monthly SIP updated to ${formatCurrency(result.requiredMonthlySip)}!`, 'success');
  };

  // Solver Action 2: Apply Feasible Retirement Age
  const handleApplyFeasibleAge = () => {
    updateInputs({ retirementAge: result.feasibleRetirementAge });
    setTargetAge(result.feasibleRetirementAge);
    logDecision({
      category: 'retirement',
      actionTitle: `Applied Feasible Retirement Age: ${result.feasibleRetirementAge}`,
      summary: `Calibrated target retirement age from ${inputs.retirementAge} to ${result.feasibleRetirementAge} based on current SIP runway.`,
      previousValue: `Age ${inputs.retirementAge}`,
      newValue: `Age ${result.feasibleRetirementAge}`,
      rationale: `Compounding at the current SIP rate of ${formatCurrency(inputs.sip.amount)}/mo reaches ${formatCurrencyCompact(targetCorpus)} at age ${result.feasibleRetirementAge}.`,
      author: 'Adviser',
      revertPatch: { retirementAge: inputs.retirementAge },
    });
    showToast(`Retirement age shifted to ${result.feasibleRetirementAge}!`, 'success');
  };

  // Solver Action 3: Apply Max Sustainable Spend
  const handleApplySustainableSpend = () => {
    updateSWP({ monthlyNeedToday: result.maxSustainableMonthlySpend });
    logDecision({
      category: 'retirement',
      actionTitle: `Applied Sustainable Living Spend: ${formatCurrency(result.maxSustainableMonthlySpend)}/mo`,
      summary: `Calibrated post-retirement monthly living expenditure to ${formatCurrency(result.maxSustainableMonthlySpend)} (today's purchasing power).`,
      previousValue: `${formatCurrency(inputs.swp.monthlyNeedToday)}/mo`,
      newValue: `${formatCurrency(result.maxSustainableMonthlySpend)}/mo`,
      rationale: `Calibrated decumulation to the maximum sustainable annuity yield over ${inputs.lifeExpectancy - targetAge} years from target corpus.`,
      author: 'Adviser',
      revertPatch: { swp: { ...inputs.swp } },
    });
    showToast(`Retirement living budget updated to ${formatCurrency(result.maxSustainableMonthlySpend)}/mo!`, 'success');
  };

  // 1-Click Apply for 4 Strategic Pathways
  const handleApplyPathway = (pathway: ReversePathway) => {
    updateInputs(pathway.patch);
    if (pathway.patch.retirementAge) {
      setTargetAge(pathway.patch.retirementAge);
    }
    logDecision({
      category: 'retirement',
      actionTitle: `Applied Reverse Planning: ${pathway.name}`,
      summary: `${pathway.primaryAction} to achieve ${formatCurrencyCompact(targetCorpus)} target corpus.`,
      newValue: `${formatCurrencyCompact(pathway.targetCorpus)} Target`,
      rationale: pathway.tradeOffDescription,
      author: 'Adviser',
      revertPatch: {
        retirementAge: inputs.retirementAge,
        sip: { ...inputs.sip },
        swp: { ...inputs.swp },
      },
    });
    setAppliedPathway(pathway.id);
    showToast(`Applied "${pathway.name}" to Master Plan!`, 'success');
  };

  const isSipAlreadyApplied = inputs.sip.amount === result.requiredMonthlySip;
  const isAgeAlreadyApplied = inputs.retirementAge === result.feasibleRetirementAge;
  const isSpendAlreadyApplied = inputs.swp.monthlyNeedToday === result.maxSustainableMonthlySpend;

  const milestonePresets = [50000000, 75000000, 100000000, 150000000];
  const agePresets = [45, 50, 55, 58, 60].filter(
    (age) => age > inputs.currentAge && age < inputs.lifeExpectancy,
  );

  return (
    <div className="space-y-6">
      {/* Target Milestone Configuration Card */}
      <Card className="border border-zinc-200 bg-white shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-zinc-950 text-white rounded-lg">
                <Compass size={18} />
              </span>
              <h3 className="text-xl font-sans font-bold text-zinc-950 tracking-tight">
                Reverse Planning & Target Milestone Solver
              </h3>
              <Badge variant="navy" className="text-[10px] uppercase font-mono">
                Milestone Solver
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Set your target retirement corpus milestone to compute required monthly contributions, required capital, and feasible retirement timelines.
            </p>
          </div>
        </div>

        {/* Milestone Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-zinc-50 rounded-2xl border border-zinc-200">
          <div className="space-y-2.5">
            <CurrencyInput
              label="Target Retirement Corpus Milestone"
              value={targetCorpus}
              onChange={setTargetCorpus}
              helper={`Current projected corpus: ${formatCurrencyCompact(wealthResult.terminalValue)}`}
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-zinc-500">Presets:</span>
              {milestonePresets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTargetCorpus(amt)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-colors cursor-pointer ${
                    targetCorpus === amt
                      ? 'bg-zinc-950 text-white shadow-2xs'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                  }`}
                >
                  {formatCurrencyCompact(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Slider
              label="Target Retirement Age"
              value={targetAge}
              onChange={handleTargetAgeChange}
              min={inputs.currentAge + 1}
              max={Math.min(75, inputs.lifeExpectancy - 5)}
              step={1}
              suffix=" yrs old"
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-zinc-500">Age Presets:</span>
              {agePresets.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => handleTargetAgeChange(age)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-colors cursor-pointer ${
                    targetAge === age
                      ? 'bg-zinc-950 text-white shadow-2xs'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                  }`}
                >
                  Age {age}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-zinc-500 pt-0.5">
              <span>Current Age: {inputs.currentAge}</span>
              <span className="font-semibold text-zinc-800">{result.yearsToTarget} Years Compounding</span>
              <span>Life Expectancy: {inputs.lifeExpectancy}</span>
            </div>
          </div>
        </div>

        {/* 1-Click Solver Action Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
              <Layers size={14} className="text-zinc-700" />
              Target Solver Diagnostics & 1-Click Plan Actions
            </h4>
            <span className="text-[11px] text-zinc-500 font-medium">Click any lever to immediately synchronize with Master Plan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lever 1: Required Monthly SIP */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                  <span>Required Monthly SIP</span>
                  <TrendingUp size={14} className="text-zinc-700" />
                </div>
                <div className="text-xl font-bold font-mono text-zinc-950">
                  {formatCurrency(result.requiredMonthlySip)}
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-snug">
                  Current SIP: <strong>{formatCurrency(inputs.sip.amount)}/mo</strong> ({result.requiredMonthlySip > inputs.sip.amount ? `+${formatCurrency(result.requiredMonthlySip - inputs.sip.amount)}` : 'Sufficient'}).
                </p>
              </div>
              <Button
                size="sm"
                variant={isSipAlreadyApplied ? 'outline' : 'primary'}
                onClick={handleApplyRequiredSip}
                disabled={isSipAlreadyApplied || result.requiredMonthlySip <= 0}
                className={`w-full text-xs font-semibold ${
                  isSipAlreadyApplied
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                    : 'bg-zinc-950 text-white hover:bg-zinc-800'
                }`}
              >
                {isSipAlreadyApplied ? (
                  <>
                    <CheckCircle2 size={13} className="mr-1.5 text-emerald-600" /> Current SIP
                  </>
                ) : (
                  'Apply Required SIP'
                )}
              </Button>
            </div>

            {/* Lever 2: Feasible Retirement Age */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                  <span>Feasible Retirement Age</span>
                  <Clock size={14} className="text-zinc-700" />
                </div>
                <div className="text-xl font-bold font-mono text-zinc-950">
                  Age {result.feasibleRetirementAge}
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-snug">
                  At current SIP: {result.feasibleRetirementAge === inputs.retirementAge ? 'Matches planned age' : `${result.feasibleRetirementAge > inputs.retirementAge ? `+${result.feasibleRetirementAge - inputs.retirementAge}` : result.feasibleRetirementAge - inputs.retirementAge} yrs vs Age ${inputs.retirementAge}`}.
                </p>
              </div>
              <Button
                size="sm"
                variant={isAgeAlreadyApplied ? 'outline' : 'primary'}
                onClick={handleApplyFeasibleAge}
                disabled={isAgeAlreadyApplied}
                className={`w-full text-xs font-semibold ${
                  isAgeAlreadyApplied
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                    : 'bg-zinc-950 text-white hover:bg-zinc-800'
                }`}
              >
                {isAgeAlreadyApplied ? (
                  <>
                    <CheckCircle2 size={13} className="mr-1.5 text-emerald-600" /> Current Age
                  </>
                ) : (
                  `Retire at Age ${result.feasibleRetirementAge}`
                )}
              </Button>
            </div>

            {/* Lever 3: Max Sustainable Spend */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                  <span>Max Sustainable Spend</span>
                  <ShieldCheck size={14} className="text-emerald-700" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-700">
                  {formatCurrency(result.maxSustainableMonthlySpend)}/mo
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-snug">
                  Target spend today: <strong>{formatCurrency(inputs.swp.monthlyNeedToday)}/mo</strong>.
                </p>
              </div>
              <Button
                size="sm"
                variant={isSpendAlreadyApplied ? 'outline' : 'primary'}
                onClick={handleApplySustainableSpend}
                disabled={isSpendAlreadyApplied || result.maxSustainableMonthlySpend <= 0}
                className={`w-full text-xs font-semibold ${
                  isSpendAlreadyApplied
                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                    : 'bg-zinc-950 text-white hover:bg-zinc-800'
                }`}
              >
                {isSpendAlreadyApplied ? (
                  <>
                    <CheckCircle2 size={13} className="mr-1.5 text-emerald-600" /> Spend Applied
                  </>
                ) : (
                  'Apply Sustainable Spend'
                )}
              </Button>
            </div>

            {/* Lever 4: Required Capital Today */}
            <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">
                  <span>Required Capital Today</span>
                  <DollarSign size={14} className="text-zinc-700" />
                </div>
                <div className="text-xl font-bold font-mono text-zinc-950">
                  {formatCurrencyCompact(result.requiredInitialCorpus)}
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-snug">
                  Net worth: {formatCurrencyCompact(currentWealth)} ({currentWealth >= result.requiredInitialCorpus ? (
                    <span className="text-emerald-700 font-semibold">Surplus</span>
                  ) : (
                    <span className="text-rose-700 font-semibold">Shortfall {formatCurrencyCompact(result.requiredInitialCorpus - currentWealth)}</span>
                  )}).
                </p>
              </div>
              <div className="text-[11px] text-zinc-500 py-1.5 px-2 bg-zinc-50 rounded-lg text-center font-medium border border-zinc-200">
                Lump sum capital requirement
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 Strategic Pathways */}
      <div className="space-y-4">
        <div>
          <h4 className="text-base font-sans font-bold text-zinc-950 tracking-tight">
            Strategic Implementation Pathways
          </h4>
          <p className="text-xs text-zinc-500">
            Four mathematical pathways to achieve {formatCurrencyCompact(targetCorpus)}:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {result.pathways.map((p) => {
            const isApplied = appliedPathway === p.id;
            return (
              <Card
                key={p.id}
                className={`p-5 flex flex-col justify-between border transition-all ${
                  isApplied
                    ? 'border-emerald-500 bg-emerald-50/20 shadow-2xs'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        {p.tagline}
                      </span>
                      <h4 className="text-base font-bold text-zinc-950 mt-0.5">{p.name}</h4>
                    </div>
                    <Badge
                      variant={p.successProbability >= 94 ? 'success' : 'navy'}
                      className="text-[10px] font-mono shrink-0"
                    >
                      {p.successProbability}% Success
                    </Badge>
                  </div>

                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700 font-medium leading-relaxed">
                    {p.summary}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Monthly SIP</span>
                      <span className="font-bold font-mono text-zinc-950">{formatCurrency(p.requiredSipMonthly)}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Retirement Age</span>
                      <span className="font-bold font-mono text-zinc-950">Age {p.projectedRetirementAge}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-zinc-200">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold block">Post-Ret Spend</span>
                      <span className="font-bold font-mono text-zinc-950">{formatCurrency(p.monthlyRetirementSpending)}/mo</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-600 leading-snug">
                    <strong className="text-zinc-900">Trade-Off Analysis:</strong> {p.tradeOffDescription}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-800">{p.primaryAction}</span>
                  <Button
                    size="sm"
                    variant={isApplied ? 'outline' : 'primary'}
                    onClick={() => handleApplyPathway(p)}
                    className={
                      isApplied
                        ? 'border-emerald-500 text-emerald-800 bg-emerald-50 text-xs font-semibold'
                        : 'bg-zinc-950 text-white hover:bg-zinc-800 text-xs font-semibold'
                    }
                  >
                    {isApplied ? (
                      <>
                        <CheckCircle2 size={13} className="mr-1 text-emerald-600" />
                        Applied to Plan
                      </>
                    ) : (
                      <>
                        Apply Pathway <ArrowRight size={13} className="ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
