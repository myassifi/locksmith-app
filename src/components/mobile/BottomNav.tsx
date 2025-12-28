import { Link, useLocation } from 'react-router-dom';
import { Home, Package, Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-gradient-to-r from-primary to-accent text-primary-foreground backdrop-blur-md md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[4rem] min-h-[44px] transition-colors rounded-full',
                isActive
                  ? 'bg-white/15 text-primary-foreground shadow-sm'
                  : 'text-primary-foreground/80 hover:text-primary-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'fill-current')} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
