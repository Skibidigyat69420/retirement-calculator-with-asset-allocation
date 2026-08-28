import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CalculatorProvider } from './context/CalculatorContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { MasterPlan } from './pages/MasterPlan';

import { SIP } from './pages/SIP';
import { STP } from './pages/STP';
import { SWP } from './pages/SWP';
import { Allocation } from './pages/Allocation';
import { GoalPlanner } from './pages/GoalPlanner';
import { Retirement } from './pages/Retirement';
import { Inflation } from './pages/Inflation';
import { AngelConnect } from './pages/AngelConnect';
import { MVO } from './pages/MVO';
import { MarketData } from './pages/MarketData';
import { LiveMarket } from './pages/LiveMarket';
import { PortfolioAnalytics } from './pages/PortfolioAnalytics';
import { AdvancedAllocation } from './pages/AdvancedAllocation';
import { TradeAnalytics } from './pages/TradeAnalytics';
import { SequenceRisk } from './pages/SequenceRisk';
import { SWR } from './pages/SWR';
import { Rebalancing } from './pages/Rebalancing';
import { TaxLossHarvesting } from './pages/TaxLossHarvesting';
import { IPSTemplate } from './pages/IPSTemplate';
import { RiskQuestionnaire } from './pages/RiskQuestionnaire';
import { Reports } from './pages/Reports';

function App() {
  return (
    <CalculatorProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/master-plan" element={<MasterPlan />} />
            <Route path="/sip" element={<SIP />} />
            <Route path="/stp" element={<STP />} />
            <Route path="/swp" element={<SWP />} />
            <Route path="/allocation" element={<Allocation />} />
            <Route path="/goal" element={<GoalPlanner />} />
            <Route path="/retirement" element={<Retirement />} />
            <Route path="/inflation" element={<Inflation />} />
            <Route path="/angel-connect" element={<AngelConnect />} />
            <Route path="/mvo" element={<MVO />} />
            <Route path="/market-data" element={<MarketData />} />
            <Route path="/live-market" element={<LiveMarket />} />
            <Route path="/portfolio-analytics" element={<PortfolioAnalytics />} />
            <Route path="/advanced-allocation" element={<AdvancedAllocation />} />
            <Route path="/trade-analytics" element={<TradeAnalytics />} />
            <Route path="/sequence-risk" element={<SequenceRisk />} />
            <Route path="/swr" element={<SWR />} />
            <Route path="/rebalancing" element={<Rebalancing />} />
            <Route path="/tax-loss-harvesting" element={<TaxLossHarvesting />} />
            <Route path="/ips" element={<IPSTemplate />} />
            <Route path="/risk" element={<RiskQuestionnaire />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </CalculatorProvider>
  );
}

export default App;
