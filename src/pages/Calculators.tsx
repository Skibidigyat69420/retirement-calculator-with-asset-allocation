import { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Target,
  Umbrella,
  Banknote,
} from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Tabs } from '../components/ui/Tabs';
import { SIPCalculator } from '../components/calculators/SIPCalculator';
import { LumpsumCalculator } from '../components/calculators/LumpsumCalculator';
import { SWPCalculator } from '../components/calculators/SWPCalculator';
import { STPCalculator } from '../components/calculators/STPCalculator';
import { GoalCalculator } from '../components/calculators/GoalCalculator';
import { RetirementCorpusCalculator } from '../components/calculators/RetirementCorpusCalculator';
import { EMICalculator } from '../components/calculators/EMICalculator';

import { WorkflowFooter } from '../components/layout/WorkflowFooter';

const tabs = [
  { id: 'sip', label: 'SIP', icon: <TrendingUp size={16} /> },
  { id: 'lumpsum', label: 'Lumpsum', icon: <Wallet size={16} /> },
  { id: 'swp', label: 'Corpus Sustainability', icon: <Umbrella size={16} /> },
  { id: 'stp', label: 'STP', icon: <ArrowRightLeft size={16} /> },
  { id: 'goal', label: 'Target Corpus', icon: <Target size={16} /> },
  { id: 'retirement', label: 'Retirement Corpus', icon: <Calculator size={16} /> },
  { id: 'emi', label: 'EMI', icon: <Banknote size={16} /> },
];

export const Calculators = () => {
  const [activeTab, setActiveTab] = useState('sip');

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Financial Calculators"
        subtitle="Standalone, transparent calculators for every decision — SIP, lumpsum, withdrawals, transfers, goals, retirement, and loans."
        badge="Tools"
      />

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'sip' && <SIPCalculator />}
      {activeTab === 'lumpsum' && <LumpsumCalculator />}
      {activeTab === 'swp' && <SWPCalculator />}
      {activeTab === 'stp' && <STPCalculator />}
      {activeTab === 'goal' && <GoalCalculator />}
      {activeTab === 'retirement' && <RetirementCorpusCalculator />}
      {activeTab === 'emi' && <EMICalculator />}

      <WorkflowFooter
        prev={{ path: '/ips', label: 'Investment Policy Statement' }}
        next={{ path: '/connect', label: 'Angel One Connect' }}
        flowHint="Standalone calculators allow quick what-if simulations before committing parameters to the master plan."
      />
    </div>
  );
};
