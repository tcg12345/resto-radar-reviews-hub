
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
import { Layout } from "./components/Layout";
import { FriendsPage } from "./pages/FriendsPage";
import { ChatListPage } from "./pages/ChatListPage";
import { ChatPage } from "./pages/ChatPage";
import HomePageWrapper from "./pages/HomePageWrapper";
import RatedRestaurantsPageWrapper from "./pages/RatedRestaurantsPageWrapper";
import WishlistPageWrapper from "./pages/WishlistPageWrapper";
import MapPageWrapper from "./pages/MapPageWrapper";
import UnifiedSearchPage from "./pages/UnifiedSearchPage";
import SettingsPageWrapper from "./pages/SettingsPageWrapper";
import SearchTabsPage from "./pages/SearchTabsPage";
import MobileFriendProfilePage from "./pages/mobile/MobileFriendProfilePage";
import ItineraryPage from "./pages/ItineraryPage";


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
                
                {/* Individual section routes */}
                <Route path="/home" element={<RequireAuth><Layout activeTab="home"><HomePageWrapper /></Layout></RequireAuth>} />
                <Route path="/rated" element={<RequireAuth><Layout activeTab="rated"><RatedRestaurantsPageWrapper /></Layout></RequireAuth>} />
                <Route path="/wishlist" element={<RequireAuth><Layout activeTab="wishlist"><WishlistPageWrapper /></Layout></RequireAuth>} />
                <Route path="/map" element={<RequireAuth><Layout activeTab="search" showChatbot={false}><MapPageWrapper /></Layout></RequireAuth>} />
                <Route path="/itinerary" element={<RequireAuth><Layout activeTab="itinerary"><ItineraryPage /></Layout></RequireAuth>} />
                
                {/* Search section with sub-tabs */}
                <Route path="/search" element={<RequireAuth><Layout activeTab="search"><SearchTabsPage /></Layout></RequireAuth>} />
                <Route path="/search/:tab" element={<RequireAuth><Layout activeTab="search"><SearchTabsPage /></Layout></RequireAuth>} />
                
                <Route path="/settings" element={<RequireAuth><Layout activeTab="settings" showNavbar={false} showChatbot={false}><SettingsPageWrapper /></Layout></RequireAuth>} />
                <Route path="/friends" element={<RequireAuth><Layout activeTab="friends"><FriendsPage /></Layout></RequireAuth>} />
                
                {/* User profile routes */}
                <Route path="/user/:userId" element={<RequireAuth><MobileFriendProfilePage /></RequireAuth>} />
                <Route path="/profile/:userId" element={<RequireAuth><MobileFriendProfilePage /></RequireAuth>} />
                
                {/* Legacy friends activity route - redirect to search/friends */}
                <Route path="/friends-activity" element={<RequireAuth><Layout activeTab="search"><SearchTabsPage /></Layout></RequireAuth>} />
                
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
