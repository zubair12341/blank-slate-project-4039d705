import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Calculator } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Button } from '@/components/ui/button';
import { CalculatorModal } from '@/components/CalculatorModal';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';


export default function MainLayout() {
  const location = useLocation();
  const { user, isLoading, hasPermission } = useAuth();
  const { settings } = useRestaurant();
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Enable order notifications
  useOrderNotifications();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Map routes to their required permissions
  const routePermissionMap: Record<string, string> = {
    '': 'dashboard',
    'dashboard': 'dashboard',
    'pos': 'pos',
    'online-orders': 'orders',
    'takeaway-orders': 'orders',
    'food-items': 'food-items',
    'menu': 'food-items',
    'recipes': 'recipes',
    'ingredients': 'ingredients',
    'store-stock': 'store-stock',
    'stock': 'store-stock',
    'kitchen-stock': 'kitchen-stock',
    'direct-sales': 'store-stock',
    'orders': 'orders',
    'daily-costs': 'daily-costs',
    'daily-report': 'reports',
    'reports': 'reports',
    'staff': 'staff',
    'settings': 'settings',
  };

  // Check route permission
  const currentPath = location.pathname.replace(/^\//, '') || '';
  const pathPermission = routePermissionMap[currentPath] || currentPath;
  
  // Allow pos-users to access root (redirect to POS)
  if (!hasPermission(pathPermission) && pathPermission !== 'dashboard') {
    // Redirect to POS for pos_user role or dashboard for others
    return <Navigate to={hasPermission('pos') ? '/pos' : '/'} replace />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header with Toggle and Calculator */}
          <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
            <SidebarTrigger className="shrink-0" />
            <div className="flex-1">
              <h1 className="font-display font-bold lg:hidden">{settings.name}</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCalculator(true)}
              className="shrink-0"
              title="Open Calculator"
            >
              <Calculator className="h-5 w-5" />
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Calculator Modal */}
      <CalculatorModal isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
    </SidebarProvider>
  );
}
