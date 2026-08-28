import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { navItems } from './navItems';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar = ({ onMenuClick }: TopBarProps) => {
  const location = useLocation();
  const current = navItems.find((item) => item.path === location.pathname);
  const label = current?.label || 'Wealth Planner';

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-stone-200">
      <div className="flex items-center justify-between h-16 px-4">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 text-stone-500 hover:text-navy rounded-lg hover:bg-stone-100 transition-colors"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-navy rounded-lg flex items-center justify-center">
            <span className="text-gold font-serif font-bold">S</span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sound Thesis</div>
            <div className="text-sm font-serif text-navy leading-tight">{label}</div>
          </div>
        </div>
        <div className="w-8" />
      </div>
    </header>
  );
};
