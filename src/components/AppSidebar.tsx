import { Link, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/ui/sidebar';
import { Home, Package, Users, Briefcase, FileText, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/documentation', icon: FileText, label: 'Documentation' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar>
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Flame className="h-6 w-6 text-primary" />
            <span className="text-lg">Heat Wave</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </Sidebar>
  );
}
