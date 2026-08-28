import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { navItems, utilityItem } from './navItems';

interface NavLinkProps {
  item: typeof navItems[0];
  onClick?: () => void;
}

const NavLink = ({ item, onClick }: NavLinkProps) => {
  const location = useLocation();
  const Icon = item.icon;
  const active = location.pathname === item.path;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
        active
          ? 'bg-navy text-white shadow-md'
          : 'text-stone-500 hover:bg-white hover:text-navy hover:shadow-sm',
      )}
    >
      <Icon size={18} className={cn('transition-colors', active ? 'text-white' : 'text-stone-400 group-hover:text-ink')} />
      <span>{item.label}</span>
    </Link>
  );
};

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ mobileOpen, onClose }: SidebarProps) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-stone-200/80 bg-cream/95 backdrop-blur-sm px-4 py-6">
        <Link to="/" className="flex items-center gap-3 px-2 mb-8">
          <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-gold font-serif font-bold text-lg">S</span>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sound Thesis</div>
            <div className="text-sm font-serif text-navy leading-tight">Wealth Planner</div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="pt-4 border-t border-stone-200/70">
          <NavLink item={utilityItem} />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-navy/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="w-72 bg-cream h-full shadow-elevated px-4 py-6 flex flex-col">
            <div className="flex items-center justify-between px-2 mb-8">
              <Link to="/" onClick={onClose} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-navy rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-gold font-serif font-bold text-lg">S</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sound Thesis</div>
                  <div className="text-sm font-serif text-navy leading-tight">Wealth Planner</div>
                </div>
              </Link>
              <button onClick={onClose} className="p-2 text-stone-500 hover:text-navy">
                <X size={20} />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navItems.map((item) => (
                <NavLink key={item.path} item={item} onClick={onClose} />
              ))}
            </nav>

            <div className="pt-4 border-t border-stone-200/70">
              <NavLink item={utilityItem} onClick={onClose} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
