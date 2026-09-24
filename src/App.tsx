import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalculatorProvider } from './context/CalculatorContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './lib/theme';
import { Layout } from './components/layout/Layout';
import { Skeleton } from './components/Skeleton';

import { OnboardingPage, INVITATION_KEY } from './pages/OnboardingPage';
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
const ReportsPage = lazyNamed(() => import('./pages/ReportsPage'), 'ReportsPage');
const AngelData = lazyNamed(() => import('./pages/AngelData'), 'AngelData');
const Calculators = lazyNamed(() => import('./pages/Calculators'), 'Calculators');
const ReversePlanning = lazyNamed(() => import('./pages/ReversePlanningPage'), 'ReversePlanningPage');
const AdvancedPortfolio = lazyNamed(() => import('./pages/AdvancedPortfolioPage'), 'AdvancedPortfolioPage');
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
          <Route path="/advanced-portfolio" element={<AdvancedPortfolio />} />
          <Route path="/meeting-workflow" element={<ClientMeeting />} />
          <Route path="/decision-history" element={<DecisionHistory />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/dossier" element={<Dossier />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/ips" element={<IPSTemplate />} />
          <Route path="/angel-connect" element={<AngelConnect />} />
          <Route path="/angel-data" element={<AngelData />} />
          <Route path="/team" element={<PracticeTeam />} />
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
  const { ready, user, recovery, needsOnboarding, organizationId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const token = new URLSearchParams(location.hash.slice(1)).get('invite');
    if (token && token.length <= 200) {
      sessionStorage.setItem(INVITATION_KEY, token);
      navigate(location.pathname, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);
  if (!ready) return <p role="status">Restoring your session…</p>;
  if (recovery || location.pathname === '/reset-password') return <AuthPage key="update-password" mode="update-password" />;
  if (needsOnboarding || (user && (location.pathname === '/join-practice' || sessionStorage.getItem(INVITATION_KEY)))) return <OnboardingPage invitationOnly={Boolean(user)} />;
  if (!user) return <Routes><Route path="/signup" element={<AuthPage mode="sign-up" />} /><Route path="/forgot-password" element={<AuthPage mode="reset" />} /><Route path="*" element={<AuthPage />} /></Routes>;
  return (
    <CalculatorProvider key={`${user.id}:${organizationId}`}>
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
        <BrowserRouter><WorkspaceRoutes /></BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
