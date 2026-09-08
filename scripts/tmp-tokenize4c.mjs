// TRACK 4 one-off, pass 3: final stragglers. Deleted after use.
import { readFileSync, writeFileSync } from 'node:fs';

const RULES = [
  ['bg-zinc-200/20', 'bg-ink/20'],
  ['ring-white', 'ring-surface'],
  ['focus:ring-zinc-950', 'focus:ring-focus-ring'],
  ['accent-zinc-950', 'accent-ink'],
  ['hover:bg-zinc-200/80', 'hover:bg-raised'],
  ['hover:bg-zinc-200', 'hover:bg-raised'],
  ['hover:border-zinc-400', 'hover:border-border-strong'],
  ['focus:border-zinc-400', 'focus:border-border-strong'],
  ['bg-zinc-200/80', 'bg-sunken'],
  ['bg-zinc-200/70', 'bg-sunken'],
  ['bg-zinc-200', 'bg-sunken'],
  ['bg-zinc-300', 'bg-faint'],
  ['border-zinc-950', 'border-border'],
  ['bg-rose-100', 'bg-negative-soft'],
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
console.log('Pass 3 done.');
