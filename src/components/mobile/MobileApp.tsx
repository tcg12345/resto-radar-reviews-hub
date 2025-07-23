import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import MobileHomePage from '@/pages/mobile/MobileHomePage';
import MobileAuthPage from '@/pages/mobile/MobileAuthPage';
import MobileSearchTabsPage from '@/pages/mobile/MobileSearchTabsPage';
import MobileFriendsPage from '@/pages/mobile/MobileFriendsPage';
import MobileWishlistPage from '@/pages/mobile/MobileWishlistPage';
import MobileRatedRestaurantsPage from '@/pages/mobile/MobileRatedRestaurantsPage';
import MobileMapPage from '@/pages/mobile/MobileMapPage';
import MobileSettingsPage from '@/pages/mobile/MobileSettingsPage';
import MobileRestaurantDetailPage from '@/pages/mobile/MobileRestaurantDetailPage';
import MobileChatListPage from '@/pages/mobile/MobileChatListPage';
import MobileChatPage from '@/pages/mobile/MobileChatPage';
import MobileFriendProfilePage from '@/pages/mobile/MobileFriendProfilePage';
import MobileUserProfilePage from '@/pages/mobile/MobileUserProfilePage';
import MobileItineraryPage from '@/pages/mobile/MobileItineraryPage';
import MobileFriendsActivityPage from '@/pages/mobile/MobileFriendsActivityPage';
import NotFound from '@/pages/NotFound';

export default function MobileApp() {
  return (
    <Routes>
      <Route path="/auth" element={<MobileAuthPage />} />
      <Route path="/demo" element={<MobileHomePage />} />
      
      <Route path="/" element={
        <RequireAuth>
          <MobileHomePage />
        </RequireAuth>
      } />
      
      <Route path="/rated-restaurants" element={
        <RequireAuth>
          <MobileRatedRestaurantsPage />
        </RequireAuth>
      } />
      
      <Route path="/wishlist" element={
        <RequireAuth>
          <MobileWishlistPage />
        </RequireAuth>
      } />
      
      <Route path="/map" element={
        <RequireAuth>
          <MobileMapPage />
        </RequireAuth>
      } />
      
      <Route path="/search" element={
        <RequireAuth>
          <MobileSearchTabsPage />
        </RequireAuth>
      } />
      
      <Route path="/search/:tab" element={
        <RequireAuth>
          <MobileSearchTabsPage />
        </RequireAuth>
      } />
      
      <Route path="/friends" element={
        <RequireAuth>
          <MobileFriendsPage />
        </RequireAuth>
      } />
      
      <Route path="/friends-activity" element={
        <RequireAuth>
          <MobileFriendsActivityPage />
        </RequireAuth>
      } />
      
      <Route path="/chat" element={
        <RequireAuth>
          <MobileChatListPage />
        </RequireAuth>
      } />
      
      <Route path="/chat/:friendId" element={
        <RequireAuth>
          <MobileChatPage />
        </RequireAuth>
      } />
      
      <Route path="/settings" element={
        <RequireAuth>
          <MobileSettingsPage />
        </RequireAuth>
      } />
      
      <Route path="/restaurant/:id" element={
        <RequireAuth>
          <MobileRestaurantDetailPage />
        </RequireAuth>
      } />
      
      <Route path="/user/:userId" element={
        <RequireAuth>
          <MobileUserProfilePage />
        </RequireAuth>
      } />
      
      <Route path="/friend/:friendId" element={
        <RequireAuth>
          <MobileFriendProfilePage />
        </RequireAuth>
      } />
      
      <Route path="/itinerary" element={
        <RequireAuth>
          <MobileItineraryPage />
        </RequireAuth>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}