import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, MotionConfig } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';
import { WorkspaceContextBar } from './WorkspaceContextBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-canvas min-h-[100dvh] w-full overflow-hidden flex relative selection:bg-accent selection:text-on-inkfill text-ink">
        <a href="#main-content" className="skip-to-content sr-only focus:not-sr-only">
          <span className="inline-flex items-center rounded-md bg-accent text-on-inkfill px-4 py-2.5 shadow-lg font-medium text-xs">
            Skip to main content
          </span>
        </a>
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 min-h-[100dvh] overflow-hidden">
          <TopBar onMenuClick={() => setMobileOpen(true)} mobileOpen={mobileOpen} />
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            <motion.main
              id="main-content"
              tabIndex={-1}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8 pb-20 lg:pb-8"
            >
              <div className="max-w-[1440px] mx-auto w-full flex flex-col flex-1">
                <WorkspaceContextBar />
                {children}
              </div>
            </motion.main>
            <Footer />
          </div>
        </div>

        <MobileNav />
      </div>
    </MotionConfig>
  );
};
