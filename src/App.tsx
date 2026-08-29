import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CalculatorProvider } from './context/CalculatorContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { MasterPlan } from './pages/MasterPlan';
import { Allocation } from './pages/Allocation';
import { GoalPlanner } from './pages/GoalPlanner';
import { Retirement } from './pages/Retirement';
import { AngelConnect } from './pages/AngelConnect';
import { MVO } from './pages/MVO';
import { IPSTemplate } from './pages/IPSTemplate';
import { RiskQuestionnaire } from './pages/RiskQuestionnaire';
import { Reports } from './pages/Reports';
import { AngelData } from './pages/AngelData';

function App() {
  return (
    <CalculatorProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/risk" element={<RiskQuestionnaire />} />
            <Route path="/master-plan" element={<MasterPlan />} />
            <Route path="/goal" element={<GoalPlanner />} />
            <Route path="/retirement" element={<Retirement />} />
            <Route path="/allocation" element={<Allocation />} />
            <Route path="/mvo" element={<MVO />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/ips" element={<IPSTemplate />} />
            <Route path="/angel-connect" element={<AngelConnect />} />
            <Route path="/angel-data" element={<AngelData />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </CalculatorProvider>
  );
}

export default App;
