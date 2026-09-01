import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Footer } from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-cream">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} mobileOpen={mobileOpen} />
        <motion.main
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full"
        >
          {children}
        </motion.main>
        <Footer />
      </div>
    </div>
  );
};
