// TRACK 4 one-off: swap hardcoded light-palette Tailwind classes for semantic
// tokens in Track-4-owned files. Literal, ordered replacements. Deleted after use.
import { readFileSync, writeFileSync } from 'node:fs';

// ── General light-surface rules (safe on white/light cards) ────────────────
const GENERAL = [
  ['bg-emerald-50 text-emerald-800', 'bg-positive-soft text-positive'],
  ['bg-blue-50 text-blue-800', 'bg-info-soft text-info'],
  ['bg-violet-50 text-violet-800', 'bg-info-soft text-info'],
  ['bg-rose-50 text-rose-700', 'bg-negative-soft text-negative'],
  ['bg-amber-50 text-amber-700', 'bg-warning-soft text-warning'],
  ['bg-green-50', 'bg-positive-soft'],
  ['text-zinc-950', 'text-ink'],
  ['text-zinc-900', 'text-ink'],
  ['text-zinc-800', 'text-ink-soft'],
  ['text-zinc-700', 'text-ink-soft'],
  ['text-zinc-600', 'text-muted'],
  ['text-zinc-500', 'text-muted'],
  ['text-zinc-400', 'text-faint'],
  ['text-zinc-300', 'text-faint'],
  ['text-zinc-200', 'text-faint'],
  ['text-slate-800', 'text-ink-soft'],
  ['text-slate-700', 'text-ink-soft'],
  ['text-slate-600', 'text-muted'],
  ['text-slate-500', 'text-muted'],
  ['text-slate-400', 'text-faint'],
  ['text-emerald-800', 'text-positive'],
  ['text-emerald-700', 'text-positive'],
  ['text-emerald-600', 'text-positive'],
  ['text-rose-800', 'text-negative'],
  ['text-rose-700', 'text-negative'],
  ['text-rose-600', 'text-negative'],
  ['text-amber-800', 'text-warning'],
  ['text-amber-700', 'text-warning'],
  ['text-amber-600', 'text-warning'],
  ['text-blue-800', 'text-info'],
  ['text-blue-700', 'text-info'],
  ['hover:text-zinc-950', 'hover:text-faint'],
  ['border-zinc-300', 'border-border-strong'],
  ['border-zinc-200', 'border-border'],
  ['border-zinc-100', 'border-border'],
  ['border-slate-300', 'border-border-strong'],
  ['border-slate-200', 'border-border'],
  ['border-slate-100', 'border-border'],
  ['border-emerald-200', 'border-positive/40'],
  ['border-rose-200', 'border-negative/40'],
  ['border-amber-200', 'border-warning/40'],
  ['border-blue-200', 'border-info/40'],
  ['divide-slate-100', 'divide-border'],
  ['divide-zinc-100', 'divide-border'],
  ['focus:border-zinc-900', 'focus:border-border-strong'],
  ['focus:ring-zinc-900', 'focus:ring-focus-ring'],
  ['accent-zinc-900', 'accent-ink'],
  ['focus:bg-white', 'focus:bg-surface'],
  ['bg-slate-100', 'bg-sunken'],
  ['bg-zinc-100', 'bg-sunken'],
  ['bg-zinc-50', 'bg-sunken'],
  ['bg-white/70', 'bg-surface/70'],
  ['bg-white', 'bg-surface'],
];

// ── Dark-surface rules (intentionally dark components; run BEFORE general) ──
const DARK = [
  ['from-zinc-950 via-zinc-900 to-black', 'from-surface via-sunken to-sunken'],
  ['bg-white/20', 'bg-ink/20'],
  ['bg-white/10', 'bg-ink/10'],
  ['border-white/20', 'border-ink/20'],
  ['text-white/70', 'text-ink/70'],
  ['text-white', 'text-ink'],
  ['bg-navy', 'bg-sunken'],
  ['bg-slate-900', 'bg-sunken'],
  ['bg-zinc-950', 'bg-sunken'],
  ['bg-zinc-900', 'bg-sunken'],
  ['bg-zinc-800', 'bg-raised'],
  ['bg-zinc-700', 'bg-faint'],
  ['border-zinc-900', 'border-border'],
  ['border-zinc-800', 'border-border'],
  ['border-zinc-700', 'border-border'],
  ['text-zinc-200', 'text-ink'],
  ['text-zinc-300', 'text-ink-soft'],
  ['text-emerald-300', 'text-positive'],
];

const FILES = {
  'src/pages/Dossier.tsx': [
    ['min-h-screen bg-zinc-100/70 print:bg-white text-zinc-900', 'min-h-screen bg-background print:bg-white text-ink'],
    ['bg-white rounded-2xl border border-zinc-200/90', 'bg-surface rounded-2xl border border-border'],
    ['bg-zinc-950 text-white px-4 py-3 shadow-md', 'bg-sunken text-ink px-4 py-3 border-b border-border shadow-md'],
    ['text-white border-zinc-700 hover:bg-zinc-800', 'text-ink border-border-strong hover:bg-raised'],
    ['bg-white text-zinc-900 hover:bg-slate-100 shadow-sm', 'bg-surface text-ink hover:bg-raised shadow-sm'],
    ['w-8 h-8 rounded-lg bg-zinc-950 text-white', 'w-8 h-8 rounded-lg bg-accent text-[#0a0e14]'],
    ['w-0.5 bg-zinc-950 rounded', 'w-0.5 bg-ink rounded'],
    ['rounded-full bg-zinc-300', 'rounded-full bg-border-strong'],
    ['rounded-full bg-zinc-400/70', 'rounded-full bg-faint/70'],
    ['border-b-2 border-zinc-900', 'border-b-2 border-border-strong'],
    ['bg-zinc-200 ', 'bg-sunken '],
    ['bg-zinc-200"', 'bg-sunken"'],
  ],
  'src/pages/Dashboard.tsx': [
    ['w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center mb-1.5 group-hover:bg-zinc-950',
     'w-8 h-8 rounded-xl bg-sunken text-ink-soft flex items-center justify-center mb-1.5 group-hover:bg-sunken'],
    ['bg-white border border-zinc-200/90 flex items-center justify-center shadow-2xs', 'bg-surface border border-border flex items-center justify-center shadow-2xs'],
  ],
  'src/pages/Retirement.tsx': [
    ['w-2.5 h-2.5 rounded-xs bg-zinc-800 inline-block', 'w-2.5 h-2.5 rounded-xs bg-sunken inline-block'],
    ['bg-zinc-800 transition-all relative', 'bg-sunken transition-all relative'],
  ],
  'src/pages/GoalPlanner.tsx': [
    ['w-3 h-3 rounded-xs bg-zinc-900 inline-block', 'w-3 h-3 rounded-xs bg-sunken inline-block'],
    ['w-4 h-4 rounded border-zinc-300 text-zinc-900', 'w-4 h-4 rounded border-border-strong text-ink'],
  ],
  'src/pages/IPSTemplate.tsx': [
    ['border-b-2 border-zinc-900', 'border-b-2 border-border-strong'],
    ['border-l-2 border-zinc-900', 'border-l-2 border-border-strong'],
    ['border-t-2 border-zinc-900', 'border-t-2 border-border-strong'],
  ],
  'src/pages/MasterPlan.tsx': [],
  'src/pages/Allocation.tsx': [],
  'src/pages/Reports.tsx': [],
  'src/pages/AngelConnect.tsx': [],
  'src/pages/AngelData.tsx': [],
  'src/pages/RiskQuestionnaire.tsx': [],
  'src/pages/ClientMeetingPage.tsx': [],
  'src/pages/DecisionHistoryPage.tsx': [],
  'src/pages/ReversePlanningPage.tsx': [],
  'src/pages/Calculators.tsx': [],
  'src/pages/AdvancedPortfolioPage.tsx': [],
  'src/components/dashboard/PlanHealthScoreCard.tsx': [],
  'src/components/dashboard/RecommendationsList.tsx': [],
  'src/components/dashboard/WhatChangedPanel.tsx': [],
  'src/components/identity/PlanManager.tsx': [],
  'src/components/calculators/CalculatorShell.tsx': [],
  'src/components/calculators/EMICalculator.tsx': [],
  'src/components/calculators/GoalCalculator.tsx': [],
  'src/components/calculators/LumpsumCalculator.tsx': [],
  'src/components/calculators/PortfolioReturnProjectionCalculator.tsx': [],
  'src/components/calculators/RetirementCorpusCalculator.tsx': [],
  'src/components/calculators/SIPCalculator.tsx': [],
  'src/components/calculators/STPCalculator.tsx': [],
  'src/components/calculators/SWPCalculator.tsx': [],
  'src/components/reports/AllocationComparisonBars.tsx': [],
  'src/components/reports/CurrencyExposureBars.tsx': [],
  'src/components/reports/GoalDistributionBars.tsx': [],
  'src/components/reports/NetWorthGrowthChart.tsx': [],
  'src/components/reports/PlanHealthPanel.tsx': [],
  'src/components/reports/PlanHealthRadial.tsx': [],
  'src/components/reports/StressImpactBars.tsx': [],
  'src/components/reports/StressMatrixTable.tsx': [],
  'src/components/reports/SWPSurvivalChart.tsx': [],
};

let total = 0;
for (const [file, pre] of Object.entries(FILES)) {
  let src = readFileSync(file, 'utf8');
  const before = src;
  const counts = [];
  for (const [from, to] of [...pre, ...DARK, ...GENERAL]) {
    if (from === to) continue;
    const n = src.split(from).length - 1;
    if (n > 0) {
      src = src.split(from).join(to);
      counts.push(`${from}→${to}×${n}`);
    }
  }
  if (src !== before) {
    writeFileSync(file, src);
    total += counts.length;
    console.log(`✔ ${file} (${counts.length} rules)`);
    console.log('   ' + counts.join(', '));
  } else {
    console.log(`— ${file} (no changes)`);
  }
}
console.log(`\nDone. ${total} rule applications.`);
