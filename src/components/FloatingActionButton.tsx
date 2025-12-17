import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';

export function FloatingActionButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleClick = () => {
    if (location.pathname === '/inventory') {
      const event = new CustomEvent('openAddInventory');
      window.dispatchEvent(event);
    } else if (location.pathname === '/customers') {
      const event = new CustomEvent('openAddCustomer');
      window.dispatchEvent(event);
    } else if (location.pathname === '/jobs') {
      const event = new CustomEvent('openAddJob');
      window.dispatchEvent(event);
    }
  };

  const shouldShow = ['/inventory', '/customers', '/jobs'].includes(location.pathname);

  if (!shouldShow) return null;

  return (
    <Button
      size="icon"
      className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg md:hidden z-40 bg-gradient-to-r from-accent to-primary text-accent-foreground hover:opacity-90"
      onClick={handleClick}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
