import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Package,
  BookOpen,
  FileText,
  Settings,
  ChefHat,
  AlertTriangle,
  Warehouse,
  Users,
  LogOut,
  Banknote,
  BarChart3,
  Wifi,
  ShoppingBag,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'POS', href: '/pos', icon: ShoppingCart, permission: 'pos' },
  { name: 'Online Orders', href: '/online-orders', icon: Wifi, permission: 'orders' },
  { name: 'Takeaway Orders', href: '/takeaway-orders', icon: ShoppingBag, permission: 'orders' },
  { name: 'Food Items', href: '/food-items', icon: UtensilsCrossed, permission: 'food-items' },
  { name: 'Recipes', href: '/recipes', icon: BookOpen, permission: 'recipes' },
  { name: 'Ingredients', href: '/ingredients', icon: Package, permission: 'ingredients' },
  { name: 'Store Stock', href: '/store-stock', icon: Warehouse, permission: 'store-stock', showBadge: true },
  { name: 'Kitchen Stock', href: '/kitchen-stock', icon: ChefHat, permission: 'kitchen-stock', showBadge: true },
  { name: 'Direct Sales', href: '/direct-sales', icon: DollarSign, permission: 'store-stock' },
  { name: 'Orders', href: '/orders', icon: FileText, permission: 'orders' },
  { name: 'Daily Costs', href: '/daily-costs', icon: Banknote, permission: 'daily-costs' },
  { name: 'Daily Report', href: '/daily-report', icon: Calendar, permission: 'reports' },
  { name: 'Reports', href: '/reports', icon: BarChart3, permission: 'reports' },
  { name: 'Staff', href: '/staff', icon: Users, permission: 'staff' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'settings' },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { getLowStockAlerts, settings } = useRestaurant();
  const { signOut, hasPermission, userName, userRole } = useAuth();
  const lowStockAlerts = getLowStockAlerts();

  const filteredNavigation = navigation.filter((item) => hasPermission(item.permission));

  return (
    <Sidebar
      className={cn('border-r border-sidebar-border transition-all duration-300')}
      style={{ background: 'var(--gradient-sidebar)' }}
      collapsible="icon"
    >
      {/* Logo Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <ChefHat className="h-6 w-6" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-lg font-display font-bold text-sidebar-accent-foreground truncate">
                {settings.name}
              </h1>
              <p className="text-xs text-sidebar-foreground/60">Restaurant POS</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                const showBadge = item.showBadge && lowStockAlerts.length > 0;

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.href}
                        className={cn(
                          'sidebar-nav-item relative',
                          isActive && 'active'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.name}</span>
                            {showBadge && (
                              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                                {lowStockAlerts.length}
                              </span>
                            )}
                          </>
                        )}
                        {collapsed && showBadge && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                            !
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Low Stock Alert and User Info */}
      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-3">
        {/* Low Stock Alert */}
        {lowStockAlerts.length > 0 && !collapsed && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-destructive">Low Stock</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {lowStockAlerts.length} items below threshold
              </p>
            </div>
          </div>
        )}

        {/* User Info and Logout */}
        {!collapsed ? (
          <div className="flex items-center justify-between rounded-lg bg-sidebar-accent/50 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {userName || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {userRole?.replace('_', ' ') || 'Guest'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="shrink-0 text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="w-full text-sidebar-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
