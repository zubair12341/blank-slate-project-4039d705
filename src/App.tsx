import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import FoodItems from "./pages/FoodItems";
import Ingredients from "./pages/Ingredients";
import RecipeManagement from "./pages/RecipeManagement";
import StoreStock from "./pages/StoreStock";
import KitchenStock from "./pages/KitchenStock";
import Orders from "./pages/Orders";
import OnlineOrders from "./pages/OnlineOrders";
import TakeawayOrders from "./pages/TakeawayOrders";
import Reports from "./pages/Reports";
import DailyCosts from "./pages/DailyCosts";
import DailyReport from "./pages/DailyReport";
import StaffManagement from "./pages/StaffManagement";
import RestaurantSettings from "./pages/Settings";
import DirectStockSales from "./pages/DirectStockSales";
import StockReport from "./pages/StockReport";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper for role-based redirects
function ProtectedDashboard() {
  const { hasPermission } = useAuth();
  
  // If user only has POS access, redirect to POS
  if (!hasPermission('dashboard') && hasPermission('pos')) {
    return <Navigate to="/pos" replace />;
  }
  
  return <Dashboard />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RestaurantProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<ProtectedDashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/food-items" element={<FoodItems />} />
                <Route path="/menu" element={<FoodItems />} />
                <Route path="/ingredients" element={<Ingredients />} />
                <Route path="/recipes" element={<RecipeManagement />} />
                <Route path="/store-stock" element={<StoreStock />} />
                <Route path="/stock" element={<StoreStock />} />
                <Route path="/kitchen-stock" element={<KitchenStock />} />
                <Route path="/direct-sales" element={<DirectStockSales />} />
                <Route path="/stock-report" element={<StockReport />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/online-orders" element={<OnlineOrders />} />
                <Route path="/takeaway-orders" element={<TakeawayOrders />} />
                <Route path="/daily-costs" element={<DailyCosts />} />
                <Route path="/daily-report" element={<DailyReport />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/staff" element={<StaffManagement />} />
                <Route path="/settings" element={<RestaurantSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </RestaurantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
