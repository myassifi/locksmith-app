import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { FloatingActionButton } from '@/components/FloatingActionButton';
import { BottomNav } from '@/components/mobile/BottomNav';
import { Button } from '@/components/ui/button';
import { LogOut, Flame, Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Add dark mode class to html element
  if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle('dark', document.documentElement.classList.contains('dark'));
  }
  const { signOut, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Force a full page reload to clear all state
      window.location.replace('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full smooth-scroll bg-background text-foreground">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile sticky header with improved design */}
          <header className="mobile-sticky h-14 sm:h-16 border-b bg-card/95 backdrop-blur-md flex items-center justify-between px-3 sm:px-4 lg:px-6">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <SidebarTrigger className="touch-target p-2 hover:bg-muted/50 rounded-md transition-colors lg:hidden">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              
              <div className="flex items-center gap-2 min-w-0 lg:hidden">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 fill-orange-500 flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                    <span className="hidden sm:inline">Heat Wave Locksmith</span>
                    <span className="sm:hidden">Heat Wave</span>
                  </h1>
                  <p className="text-xs text-muted-foreground hidden lg:block">
                    Professional Management System
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">
                  {`Welcome${user?.businessName ? `, ${user.businessName}` : ''}`}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-1 sm:gap-2 responsive-btn touch-target hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>

          {/* Main content with improved mobile layout */}
          <main className="flex-1 mobile-container py-4 sm:py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6 smooth-scroll overflow-auto relative">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        
        {/* Bottom Navigation for Mobile */}
        <BottomNav />
        
        {/* Floating Action Button for Mobile (hidden when bottom nav is active) */}
        <div className="md:block hidden">
          <FloatingActionButton />
        </div>
      </div>
    </SidebarProvider>
  );
}