
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RestaurantProvider } from "./contexts/RestaurantContext";
import { DiscoverProvider } from "./contexts/DiscoverContext";
import { FriendProfilesProvider } from "./contexts/FriendProfilesContext";
import { useResponsive } from "./hooks/useResponsive";
import { Layout } from "./components/Layout";
import MobileApp from "./components/mobile/MobileApp";
import DesktopApp from "./components/desktop/DesktopApp";

const queryClient = new QueryClient();

function AppRouter() {
  const { isMobile } = useResponsive();
  
  return isMobile ? <MobileApp /> : <DesktopApp />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RestaurantProvider>
          <DiscoverProvider>
            <FriendProfilesProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
                  <Layout>
                    <AppRouter />
                  </Layout>
                </div>
              </TooltipProvider>
            </FriendProfilesProvider>
          </DiscoverProvider>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
