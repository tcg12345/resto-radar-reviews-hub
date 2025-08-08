
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { RestaurantProvider } from "./contexts/RestaurantContext";
import { DiscoverProvider } from "./contexts/DiscoverContext";
import { FriendProfilesProvider } from "./contexts/FriendProfilesContext";
import { CommunityDataProvider } from "./contexts/CommunityDataContext";
import { RequireAuth } from "./components/RequireAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import DemoPage from "./pages/DemoPage";
import { RestaurantDetailPage } from "./pages/RestaurantDetailPage";
import { RecommendationDetailPage } from "./pages/RecommendationDetailPage";
import { FriendsActivityPage } from "./pages/FriendsActivityPage";
import { Layout } from "./components/Layout";
import { FriendsPage } from "./pages/FriendsPage";
import FriendProfilePage from "./pages/FriendProfilePage";
import { ChatListPage } from "./pages/ChatListPage";
import { ChatPage } from "./pages/ChatPage";
import HomePageWrapper from "./pages/HomePageWrapper";
import SavedPlacesPageWrapper from "./pages/SavedPlacesPageWrapper";
import MapPageWrapper from "./pages/MapPageWrapper";
import UnifiedSearchPage from "./pages/UnifiedSearchPage";
import SettingsPageWrapper from "./pages/SettingsPageWrapper";
import PrivacyPolicyPageWrapper from "./pages/PrivacyPolicyPageWrapper";
import SearchTabsPage from "./pages/SearchTabsPage";
import MobileFriendProfilePage from "./pages/mobile/MobileFriendProfilePage";
import MobileRestaurantDetailsPage from "./pages/mobile/MobileRestaurantDetailsPage";
import MobileSearchRestaurantDetailsPage from "./pages/mobile/MobileSearchRestaurantDetailsPage";
import TravelPage from "./pages/TravelPage";
import TripDetailPage from "./pages/TripDetailPage";
import { SharedTripPage } from "./pages/SharedTripPage";
import { SharedItineraryPage } from "./pages/SharedItineraryPage";
import { ItineraryViewPage } from "./pages/ItineraryViewPage";
import RestaurantPhotosPage from "./pages/RestaurantPhotosPage";
import CommunityPhotoGalleryPage from "./pages/CommunityPhotoGalleryPage";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <RestaurantProvider>
          <DiscoverProvider>
            <FriendProfilesProvider>
              <CommunityDataProvider>
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
                <Route path="/places" element={<RequireAuth><Layout activeTab="places"><SavedPlacesPageWrapper /></Layout></RequireAuth>} />
                <Route path="/rated" element={<RequireAuth><Layout activeTab="places"><SavedPlacesPageWrapper activeSubTab="rated" /></Layout></RequireAuth>} />
                <Route path="/wishlist" element={<RequireAuth><Layout activeTab="places"><SavedPlacesPageWrapper activeSubTab="wishlist" /></Layout></RequireAuth>} />
                <Route path="/map" element={<RequireAuth><Layout activeTab="search" showChatbot={false}><MapPageWrapper /></Layout></RequireAuth>} />
                <Route path="/travel" element={<RequireAuth><Layout activeTab="travel"><TravelPage /></Layout></RequireAuth>} />
                <Route path="/trip/:tripId" element={<RequireAuth><TripDetailPage /></RequireAuth>} />
                <Route path="/itinerary/:itineraryId" element={<ItineraryViewPage />} />
                <Route path="/shared-trip/:tripId" element={<SharedTripPage />} />
                <Route path="/shared-itinerary" element={<SharedItineraryPage />} />
                
                {/* Search section with sub-tabs */}
                <Route path="/search" element={<RequireAuth><Layout activeTab="search"><SearchTabsPage /></Layout></RequireAuth>} />
                <Route path="/search/:tab" element={<RequireAuth><Layout activeTab="search"><SearchTabsPage /></Layout></RequireAuth>} />
                
                <Route path="/settings" element={<RequireAuth><Layout activeTab="settings" showNavbar={false} showChatbot={false}><SettingsPageWrapper /></Layout></RequireAuth>} />
                <Route path="/privacy-policy" element={<RequireAuth><Layout activeTab="settings" showNavbar={false} showChatbot={false}><PrivacyPolicyPageWrapper /></Layout></RequireAuth>} />
                <Route path="/friends" element={<RequireAuth><Layout activeTab="profile"><FriendsPage /></Layout></RequireAuth>} />
                <Route path="/friends/:friendId" element={<RequireAuth><Layout activeTab="profile"><FriendProfilePage /></Layout></RequireAuth>} />
                
                {/* User profile routes */}
                <Route path="/user/:userId" element={<RequireAuth><MobileFriendProfilePage /></RequireAuth>} />
                <Route path="/profile/:userId" element={<RequireAuth><MobileFriendProfilePage /></RequireAuth>} />
                
                {/* Legacy friends activity route - redirect to search/friends */}
                <Route path="/friends-activity" element={<RequireAuth><Layout activeTab="search"><SearchTabsPage /></Layout></RequireAuth>} />
                
                {/* Chat routes */}
                <Route path="/chat-list" element={<RequireAuth><ChatListPage /></RequireAuth>} />
                <Route path="/chat" element={<RequireAuth><ChatListPage /></RequireAuth>} />
                <Route path="/chat/:roomId" element={<RequireAuth><ChatPage /></RequireAuth>} />
                
                {/* Restaurant detail routes */}
                <Route path="/restaurant/:restaurantId" element={<RequireAuth><RestaurantDetailPage /></RequireAuth>} />
                <Route path="/restaurant/:restaurantId/photos" element={<RequireAuth><RestaurantPhotosPage /></RequireAuth>} />
                <Route path="/restaurant/:placeId/community-photos" element={<RequireAuth><CommunityPhotoGalleryPage /></RequireAuth>} />
                <Route path="/recommendation/:place_id" element={<RequireAuth><RecommendationDetailPage /></RequireAuth>} />
                <Route path="/mobile/restaurant/:restaurantId" element={<RequireAuth><MobileRestaurantDetailsPage /></RequireAuth>} />
                <Route path="/mobile/search/restaurant" element={<RequireAuth><MobileSearchRestaurantDetailsPage /></RequireAuth>} />
                
                {/* Main route - shows landing page or dashboard based on auth */}
                <Route path="/" element={<Index />} />
            
                {/* 404 route */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
                </CommunityDataProvider>
            </FriendProfilesProvider>
          </DiscoverProvider>
        </RestaurantProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
