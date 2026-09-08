import { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex relative bg-background selection:bg-ink selection:text-background text-ink">
        <a href="#main-content" className="skip-to-content sr-only focus:not-sr-only">
          <span className="inline-flex items-center rounded-xl bg-ink text-background px-4 py-2.5 shadow-lg font-medium text-xs">
            Skip to main content
          </span>
        </a>
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onMenuClick={() => setMobileOpen(true)} mobileOpen={mobileOpen} />
          <motion.main
            id="main-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full flex flex-col"
          >
            {children}
          </motion.main>
          <Footer />
        </div>
      </div>
    </MotionConfig>
  );
};
