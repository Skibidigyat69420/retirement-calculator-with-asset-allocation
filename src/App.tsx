import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CalculatorProvider } from './context/CalculatorContext';
import { Layout } from './components/layout/Layout';
import { Skeleton } from './components/Skeleton';

function lazyNamed<T extends ComponentType<any>>(
  factory: () => Promise<{ [key: string]: T }>,
  exportName: string,
) {
  return lazy(async () => {
    const load = async () => {
      const mod = await factory();
      const component = mod[exportName];
      if (!component) {
        throw new Error(`Module does not export "${exportName}"`);
      }
      return { default: component };
    };
    try {
      return await load();
    } catch {
      // Retry once after a short pause to recover from transient dev-server hiccups.
      await new Promise((resolve) => setTimeout(resolve, 500));
      return load();
    }
  });
}

const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard');
const MasterPlan = lazyNamed(() => import('./pages/MasterPlan'), 'MasterPlan');
const Allocation = lazyNamed(() => import('./pages/Allocation'), 'Allocation');
const GoalPlanner = lazyNamed(() => import('./pages/GoalPlanner'), 'GoalPlanner');
const Retirement = lazyNamed(() => import('./pages/Retirement'), 'Retirement');
const AngelConnect = lazyNamed(() => import('./pages/AngelConnect'), 'AngelConnect');
const MVO = lazyNamed(() => import('./pages/MVO'), 'MVO');
const IPSTemplate = lazyNamed(() => import('./pages/IPSTemplate'), 'IPSTemplate');
const RiskQuestionnaire = lazyNamed(() => import('./pages/RiskQuestionnaire'), 'RiskQuestionnaire');
const Reports = lazyNamed(() => import('./pages/Reports'), 'Reports');
const Dossier = lazyNamed(() => import('./pages/Dossier'), 'Dossier');
const AngelData = lazyNamed(() => import('./pages/AngelData'), 'AngelData');
const Calculators = lazyNamed(() => import('./pages/Calculators'), 'Calculators');

function App() {
  return (
    <CalculatorProvider>
      <BrowserRouter>
        <Layout>
          <Suspense fallback={<Skeleton />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/risk" element={<RiskQuestionnaire />} />
              <Route path="/master-plan" element={<MasterPlan />} />
              <Route path="/goal" element={<GoalPlanner />} />
              <Route path="/retirement" element={<Retirement />} />
              <Route path="/allocation" element={<Allocation />} />
              <Route path="/mvo" element={<MVO />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/dossier" element={<Dossier />} />
              <Route path="/calculators" element={<Calculators />} />
              <Route path="/ips" element={<IPSTemplate />} />
              <Route path="/angel-connect" element={<AngelConnect />} />
              <Route path="/angel-data" element={<AngelData />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Layout>
      </BrowserRouter>
    </CalculatorProvider>
  );
}

export default App;
