import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RestaurantProvider } from "./contexts/RestaurantContext";
import { DiscoverProvider } from "./contexts/DiscoverContext";
import { RequireAuth } from "./components/RequireAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import DemoPage from "./pages/DemoPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RestaurantProvider>
          <DiscoverProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Auth route - doesn't need RestaurantProvider */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Demo route - shows demo functionality */}
                <Route path="/demo" element={<DemoPage />} />
                
                {/* Main route - shows landing page or dashboard based on auth */}
                <Route path="/" element={<Index />} />
            
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </DiscoverProvider>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
