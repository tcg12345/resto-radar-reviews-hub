
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RestaurantProvider } from "./contexts/RestaurantContext";
import { DiscoverProvider } from "./contexts/DiscoverContext";
import { FriendProfilesProvider } from "./contexts/FriendProfilesContext";
import { RequireAuth } from "./components/RequireAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import DemoPage from "./pages/DemoPage";
import { RestaurantDetailPage } from "./pages/RestaurantDetailPage";
import { FriendsActivityPage } from "./pages/FriendsActivityPage";
import { FriendsPage } from "./pages/FriendsPage";
import { ChatListPage } from "./pages/ChatListPage";
import { ChatPage } from "./pages/ChatPage";


const queryClient = new QueryClient();

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
                <Routes>
                {/* Auth route - doesn't need RestaurantProvider */}
                <Route path="/auth" element={<AuthPage />} />
                
                {/* Demo route - shows demo functionality */}
                <Route path="/demo" element={<DemoPage />} />
                
                {/* Friends route */}
                <Route path="/friends" element={<RequireAuth><FriendsPage /></RequireAuth>} />
                
                {/* Friends Activity route */}
                <Route path="/friends-activity" element={<RequireAuth><FriendsActivityPage /></RequireAuth>} />
                
                {/* Chat routes */}
                <Route path="/chat-list" element={<RequireAuth><ChatListPage /></RequireAuth>} />
                <Route path="/chat" element={<RequireAuth><ChatListPage /></RequireAuth>} />
                <Route path="/chat/:roomId" element={<RequireAuth><ChatPage /></RequireAuth>} />
                
                {/* Restaurant detail route */}
                <Route path="/restaurant/:restaurantId" element={<RequireAuth><RestaurantDetailPage /></RequireAuth>} />
                
                {/* Main route - shows landing page or dashboard based on auth */}
                <Route path="/" element={<Index />} />
            
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </FriendProfilesProvider>
          </DiscoverProvider>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
