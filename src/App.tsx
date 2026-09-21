import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalculatorProvider } from './context/CalculatorContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/layout/Layout';

import { AuthPage } from './pages/AuthPage';
import { useAuth } from './context/AuthContext';

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
const LandingPage = lazyNamed(() => import('./pages/LandingPage'), 'LandingPage');
const MasterPlan = lazyNamed(() => import('./pages/MasterPlan'), 'MasterPlan');
const Allocation = lazyNamed(() => import('./pages/Allocation'), 'Allocation');
const GoalPlanner = lazyNamed(() => import('./pages/GoalPlanner'), 'GoalPlanner');
const Retirement = lazyNamed(() => import('./pages/Retirement'), 'Retirement');
const AngelConnect = lazyNamed(() => import('./pages/AngelConnect'), 'AngelConnect');
const IPSTemplate = lazy(async () => {
  const mod = await import('./pages/IPSTemplate');
  return { default: mod.IPSTemplate };
});
const RiskQuestionnaire = lazyNamed(() => import('./pages/RiskQuestionnaire'), 'RiskQuestionnaire');
const Dossier = lazyNamed(() => import('./pages/Dossier'), 'Dossier');
const AngelData = lazyNamed(() => import('./pages/AngelData'), 'AngelData');
const Calculators = lazyNamed(() => import('./pages/Calculators'), 'Calculators');
const ReversePlanning = lazyNamed(() => import('./pages/ReversePlanningPage'), 'ReversePlanningPage');
const AdvancedPortfolio = lazyNamed(() => import('./pages/AdvancedPortfolioPage'), 'AdvancedPortfolioPage');
const ClientMeeting = lazyNamed(() => import('./pages/ClientMeetingPage'), 'ClientMeetingPage');
const DecisionHistory = lazyNamed(() => import('./pages/DecisionHistoryPage'), 'DecisionHistoryPage');
const Practitioner = lazyNamed(() => import('./pages/PractitionerPage'), 'PractitionerPage');
const StyleGuide = lazyNamed(() => import('./pages/StyleGuide'), 'StyleGuide');
const UIReview = lazyNamed(() => import('./pages/UIReview'), 'UIReview');

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Practitioner />} />
          <Route path="/overview" element={<Dashboard />} />
          <Route path="/risk" element={<RiskQuestionnaire />} />
          <Route path="/master-plan" element={<MasterPlan />} />
          <Route path="/client-profile" element={<MasterPlan defaultStep="profile" />} />
          <Route path="/balance-sheet" element={<MasterPlan defaultStep="financials" />} />
          <Route path="/goal" element={<GoalPlanner />} />
          <Route path="/retirement" element={<Retirement />} />
          <Route path="/reverse-planning" element={<ReversePlanning />} />
          <Route path="/allocation" element={<Allocation />} />
          <Route path="/advanced-portfolio" element={<AdvancedPortfolio />} />
          <Route path="/meeting-workflow" element={<ClientMeeting />} />
          <Route path="/decision-history" element={<DecisionHistory />} />
          <Route path="/reports" element={<Navigate to="/dossier" replace />} />
          <Route path="/dossier" element={<Dossier />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/ips" element={<IPSTemplate />} />
          <Route path="/angel-connect" element={<AngelConnect />} />
          <Route path="/angel-data" element={<AngelData />} />
          <Route path="/practitioner" element={<Practitioner />} />
          <Route path="/style-guide" element={<StyleGuide />} />
          <Route path="/ui-review" element={<UIReview />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function WorkspaceRoutes() {
  const { ready, user } = useAuth();
  if (!ready) return null;
  if (!user) return <Suspense fallback={null}><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<AuthPage />} /><Route path="/signup" element={<AuthPage mode="sign-up" />} /><Route path="/forgot-password" element={<AuthPage mode="reset" />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>;
  return (
    <CalculatorProvider>
      <Layout>
        <Suspense fallback={null}>
          <AnimatedRoutes />
        </Suspense>
      </Layout>
    </CalculatorProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter><WorkspaceRoutes /></BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
