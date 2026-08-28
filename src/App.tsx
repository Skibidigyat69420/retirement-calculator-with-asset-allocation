import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CalculatorProvider } from './context/CalculatorContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { MasterPlan } from './pages/MasterPlan';
import { Scenarios } from './pages/Scenarios';
import { SIP } from './pages/SIP';
import { STP } from './pages/STP';
import { SWP } from './pages/SWP';
import { Allocation } from './pages/Allocation';
import { GoalPlanner } from './pages/GoalPlanner';
import { Retirement } from './pages/Retirement';
import { Inflation } from './pages/Inflation';
import { AngelConnect } from './pages/AngelConnect';

function App() {
  return (
    <CalculatorProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/master-plan" element={<MasterPlan />} />
            <Route path="/scenarios" element={<Scenarios />} />
            <Route path="/sip" element={<SIP />} />
            <Route path="/stp" element={<STP />} />
            <Route path="/swp" element={<SWP />} />
            <Route path="/allocation" element={<Allocation />} />
            <Route path="/goal" element={<GoalPlanner />} />
            <Route path="/retirement" element={<Retirement />} />
            <Route path="/inflation" element={<Inflation />} />
            <Route path="/angel-connect" element={<AngelConnect />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </CalculatorProvider>
  );
}

export default App;
