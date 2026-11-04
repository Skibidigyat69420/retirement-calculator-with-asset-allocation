import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalculatorProvider } from './context/CalculatorContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/layout/Layout';
import { Skeleton } from './components/Skeleton';

import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';

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
const PlanningStudio = lazyNamed(() => import('./pages/PlanningStudioPage'), 'PlanningStudioPage');
const PolicyCenter = lazyNamed(() => import('./pages/PolicyCenterPage'), 'PolicyCenterPage');
const GoalPlanner = lazyNamed(() => import('./pages/GoalPlanner'), 'GoalPlanner');
const Retirement = lazyNamed(() => import('./pages/Retirement'), 'Retirement');
const IPSTemplate = lazy(async () => {
  const mod = await import('./pages/IPSTemplate');
  return { default: mod.IPSTemplate };
});
const IPSWorkspace = lazyNamed(() => import('./pages/IPSWorkspacePage'), 'IPSWorkspacePage');
const RiskQuestionnaire = lazyNamed(() => import('./pages/RiskQuestionnaire'), 'RiskQuestionnaire');
const Dossier = lazyNamed(() => import('./pages/Dossier'), 'Dossier');
const ReportsPage = lazyNamed(() => import('./pages/ReportsPage'), 'ReportsPage');
const Calculators = lazyNamed(() => import('./pages/Calculators'), 'Calculators');
const ReversePlanning = lazyNamed(() => import('./pages/ReversePlanningPage'), 'ReversePlanningPage');
const ClientMeeting = lazyNamed(() => import('./pages/ClientMeetingPage'), 'ClientMeetingPage');
const DecisionHistory = lazyNamed(() => import('./pages/DecisionHistoryPage'), 'DecisionHistoryPage');
const PracticeTeam = lazyNamed(() => import('./pages/PracticeTeamPage'), 'PracticeTeamPage');
const Practitioner = lazyNamed(() => import('./pages/PractitionerPage'), 'PractitionerPage');
const StyleGuide = lazyNamed(() => import('./pages/StyleGuide'), 'StyleGuide');
const UIReview = lazyNamed(() => import('./pages/UIReview'), 'UIReview');

function RouteFallback() {
  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-6 max-w-[1440px] mx-auto" aria-busy="true" aria-label="Loading">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
          <Route path="/planning" element={<PlanningStudio />} />
          <Route path="/policy" element={<PolicyCenter />} />
          <Route path="/meeting-workflow" element={<ClientMeeting />} />
          <Route path="/decision-history" element={<DecisionHistory />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/dossier" element={<Dossier />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/ips" element={<IPSWorkspace />} />
          <Route path="/ips/editor" element={<IPSTemplate />} />
          <Route path="/team" element={<PracticeTeam />} />
          <Route path="/practitioner" element={<Practitioner />} />
          <Route path="/style-guide" element={<StyleGuide />} />
          <Route path="/ui-review" element={<UIReview />} />
          <Route path="/welcome" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function WorkspaceRoutes() {
  return (
    <CalculatorProvider key="local-workspace">
      <Layout>
        <Suspense fallback={<RouteFallback />}>
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
        <BrowserRouter><AuthenticatedApplication /></BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

function AuthenticatedApplication() {
  const { ready, user, needsOnboarding, recovery } = useAuth();
  if (!ready) return <div className="min-h-screen grid place-items-center bg-canvas text-muted">Restoring your secure workspace…</div>;
  if (recovery) return <AuthPage initialMode="recovery" />;
  if (needsOnboarding) return <OnboardingPage />;
  if (!user) return <AuthPage />;
  return <WorkspaceRoutes />;
}

export default App;
