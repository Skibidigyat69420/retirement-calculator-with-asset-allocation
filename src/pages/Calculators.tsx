import { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Target,
  Umbrella,
  Banknote,
  Layers,
} from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Tabs } from '../components/ui/Tabs';
import { PortfolioReturnProjectionCalculator } from '../components/calculators/PortfolioReturnProjectionCalculator';
import { SIPCalculator } from '../components/calculators/SIPCalculator';
import { LumpsumCalculator } from '../components/calculators/LumpsumCalculator';
import { SWPCalculator } from '../components/calculators/SWPCalculator';
import { STPCalculator } from '../components/calculators/STPCalculator';
import { GoalCalculator } from '../components/calculators/GoalCalculator';
import { RetirementCorpusCalculator } from '../components/calculators/RetirementCorpusCalculator';
import { EMICalculator } from '../components/calculators/EMICalculator';

import { WorkflowFooter } from '../components/layout/WorkflowFooter';

const tabs = [
  { id: 'projection', label: 'Multi-Asset Projection', icon: <Layers size={16} /> },
  { id: 'sip', label: 'SIP', icon: <TrendingUp size={16} /> },
  { id: 'lumpsum', label: 'Lumpsum', icon: <Wallet size={16} /> },
  { id: 'swp', label: 'SWP & Drawdown', icon: <Umbrella size={16} /> },
  { id: 'stp', label: 'STP', icon: <ArrowRightLeft size={16} /> },
  { id: 'goal', label: 'Target Corpus', icon: <Target size={16} /> },
  { id: 'retirement', label: 'Retirement Corpus', icon: <Calculator size={16} /> },
  { id: 'emi', label: 'EMI', icon: <Banknote size={16} /> },
];

export const Calculators = () => {
  const [activeTab, setActiveTab] = useState('projection');

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Financial Calculators"
        subtitle="Standalone, transparent calculators for every decision — multi-asset projections with currency effects, SIP, lumpsum, withdrawals, transfers, goals, retirement, and loans."
        badge="Tools"
      />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'projection' && <PortfolioReturnProjectionCalculator />}
      {activeTab === 'sip' && <SIPCalculator />}
      {activeTab === 'lumpsum' && <LumpsumCalculator />}
      {activeTab === 'swp' && <SWPCalculator />}
      {activeTab === 'stp' && <STPCalculator />}
      {activeTab === 'goal' && <GoalCalculator />}
      {activeTab === 'retirement' && <RetirementCorpusCalculator />}
      {activeTab === 'emi' && <EMICalculator />}

      <WorkflowFooter
        prev={{ path: '/ips', label: 'IPS' }}
        next={{ path: '/angel-connect', label: 'Angel Connect' }}
        flowHint="Standalone calculators allow quick what-if simulations before committing parameters to the master plan."
      />
    </div>
  );
};
