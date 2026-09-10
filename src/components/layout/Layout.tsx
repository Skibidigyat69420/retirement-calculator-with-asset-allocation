import { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex relative selection:bg-accent selection:text-white bg-background text-ink">
        <a href="#main-content" className="skip-to-content sr-only focus:not-sr-only">
          <span className="inline-flex items-center rounded-md bg-accent text-white px-4 py-2.5 shadow-lg font-medium text-xs">
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
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-24 lg:pb-10"
          >
            <div className="max-w-[1440px] mx-auto w-full flex flex-col flex-1">
              {children}
            </div>
          </motion.main>
          <Footer />
        </div>

        <MobileNav />
      </div>
    </MotionConfig>
  );
};
