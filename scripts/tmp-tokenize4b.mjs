// TRACK 4 one-off, pass 2: tokenize chart tooltip surfaces (CSS vars flip with
// theme) + leftover slate/amber classes. Deleted after use.
import { readFileSync, writeFileSync } from 'node:fs';

const RULES = [
  // Recharts tooltip surfaces → theme tokens
  ["backgroundColor: 'rgba(255, 255, 255, 0.96)'", "backgroundColor: 'var(--color-surface)'"],
  ["border: '1px solid rgba(226, 232, 240, 0.9)'", "border: '1px solid var(--color-border)'"],
  ["backgroundColor: '#ffffff'", "backgroundColor: 'var(--color-surface)'"],
  ["background: '#ffffff'", "background: 'var(--color-surface)'"],
  ["border: '1px solid #e4e4e7'", "border: '1px solid var(--color-border)'"],
  ["border: '1px solid #e2e8f0'", "border: '1px solid var(--color-border)'"],
  // GoalPlanner histogram: near-black data marks → ink token (flips to light on dark)
  ["'#18181b'", "'var(--color-ink)'"],
  ["\"#18181b\"", "\"var(--color-ink)\""],
  ["'#d4d4d8'", "'var(--color-border-strong)'"],
  ["stroke=\"#e4e4e7\"", "stroke=\"var(--color-border)\""],
  // RiskQuestionnaire leftovers
  ["text-slate-200", "text-ink"],
  ["text-slate-300", "text-ink-soft"],
  ["bg-amber-50", "bg-warning-soft"],
  ["hover:text-amber-900", "hover:text-warning"],
  ["text-amber-900", "text-warning"],
  ["bg-slate-200 text-ink-soft hover:bg-slate-300", "bg-raised text-ink hover:bg-surface"],
  ["hover:bg-slate-300", "hover:bg-raised"],
  ["hover:bg-slate-200", "hover:bg-raised"],
  ["bg-slate-200", "bg-sunken"],
  ["bg-slate-300", "bg-raised"],
  ["ring-slate-400", "ring-focus-ring"],
  ["border-slate-400", "border-border-strong"],
  ["border-slate-900", "border-border-strong"],
  ["text-slate-900", "text-ink"],
  ["bg-slate-50", "bg-sunken"],
];

const FILES = [
  'src/pages/Dossier.tsx', 'src/pages/Dashboard.tsx', 'src/pages/Retirement.tsx',
  'src/pages/GoalPlanner.tsx', 'src/pages/IPSTemplate.tsx', 'src/pages/MasterPlan.tsx',
  'src/pages/Allocation.tsx', 'src/pages/Reports.tsx', 'src/pages/AngelConnect.tsx',
  'src/pages/AngelData.tsx', 'src/pages/RiskQuestionnaire.tsx', 'src/pages/ClientMeetingPage.tsx',
  'src/pages/DecisionHistoryPage.tsx', 'src/pages/ReversePlanningPage.tsx',
  'src/pages/Calculators.tsx', 'src/pages/AdvancedPortfolioPage.tsx',
  'src/components/dashboard/PlanHealthScoreCard.tsx',
  'src/components/dashboard/RecommendationsList.tsx',
  'src/components/dashboard/WhatChangedPanel.tsx',
  'src/components/identity/PlanManager.tsx',
  'src/components/calculators/CalculatorShell.tsx', 'src/components/calculators/EMICalculator.tsx',
  'src/components/calculators/GoalCalculator.tsx', 'src/components/calculators/LumpsumCalculator.tsx',
  'src/components/calculators/PortfolioReturnProjectionCalculator.tsx',
  'src/components/calculators/RetirementCorpusCalculator.tsx', 'src/components/calculators/SIPCalculator.tsx',
  'src/components/calculators/STPCalculator.tsx', 'src/components/calculators/SWPCalculator.tsx',
  'src/components/reports/AllocationComparisonBars.tsx', 'src/components/reports/CurrencyExposureBars.tsx',
  'src/components/reports/GoalDistributionBars.tsx', 'src/components/reports/NetWorthGrowthChart.tsx',
  'src/components/reports/PlanHealthPanel.tsx', 'src/components/reports/PlanHealthRadial.tsx',
  'src/components/reports/StressImpactBars.tsx', 'src/components/reports/StressMatrixTable.tsx',
  'src/components/reports/SWPSurvivalChart.tsx',
];

for (const file of FILES) {
  let src = readFileSync(file, 'utf8');
  const before = src;
  const hits = [];
  for (const [from, to] of RULES) {
    const n = src.split(from).length - 1;
    if (n > 0) {
      src = src.split(from).join(to);
      hits.push(`${from}×${n}`);
    }
  }
  if (src !== before) {
    writeFileSync(file, src);
    console.log(`✔ ${file}: ${hits.join(', ')}`);
  }
}
console.log('Pass 2 done.');
