import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import DesktopHomePage from '@/pages/desktop/DesktopHomePage';
import DesktopAuthPage from '@/pages/desktop/DesktopAuthPage';
import DesktopSearchTabsPage from '@/pages/desktop/DesktopSearchTabsPage';
import DesktopFriendsPage from '@/pages/desktop/DesktopFriendsPage';
import DesktopWishlistPage from '@/pages/desktop/DesktopWishlistPage';
import DesktopRatedRestaurantsPage from '@/pages/desktop/DesktopRatedRestaurantsPage';
import DesktopMapPage from '@/pages/desktop/DesktopMapPage';
import DesktopSettingsPage from '@/pages/desktop/DesktopSettingsPage';
import DesktopRestaurantDetailPage from '@/pages/desktop/DesktopRestaurantDetailPage';
import DesktopChatListPage from '@/pages/desktop/DesktopChatListPage';
import DesktopChatPage from '@/pages/desktop/DesktopChatPage';
import DesktopFriendProfilePage from '@/pages/desktop/DesktopFriendProfilePage';
import DesktopUserProfilePage from '@/pages/desktop/DesktopUserProfilePage';
import DesktopItineraryPage from '@/pages/desktop/DesktopItineraryPage';
import DesktopFriendsActivityPage from '@/pages/desktop/DesktopFriendsActivityPage';
import NotFound from '@/pages/NotFound';

export default function DesktopApp() {
  return (
    <Routes>
      <Route path="/auth" element={<DesktopAuthPage />} />
      <Route path="/demo" element={<DesktopHomePage />} />
      
      <Route path="/" element={
        <RequireAuth>
          <DesktopHomePage />
        </RequireAuth>
      } />
      
      <Route path="/rated-restaurants" element={
        <RequireAuth>
          <DesktopRatedRestaurantsPage />
        </RequireAuth>
      } />
      
      <Route path="/wishlist" element={
        <RequireAuth>
          <DesktopWishlistPage />
        </RequireAuth>
      } />
      
      <Route path="/map" element={
        <RequireAuth>
          <DesktopMapPage />
        </RequireAuth>
      } />
      
      <Route path="/search" element={
        <RequireAuth>
          <DesktopSearchTabsPage />
        </RequireAuth>
      } />
      
      <Route path="/search/:tab" element={
        <RequireAuth>
          <DesktopSearchTabsPage />
        </RequireAuth>
      } />
      
      <Route path="/friends" element={
        <RequireAuth>
          <DesktopFriendsPage />
        </RequireAuth>
      } />
      
      <Route path="/friends-activity" element={
        <RequireAuth>
          <DesktopFriendsActivityPage />
        </RequireAuth>
      } />
      
      <Route path="/chat" element={
        <RequireAuth>
          <DesktopChatListPage />
        </RequireAuth>
      } />
      
      <Route path="/chat/:friendId" element={
        <RequireAuth>
          <DesktopChatPage />
        </RequireAuth>
      } />
      
      <Route path="/settings" element={
        <RequireAuth>
          <DesktopSettingsPage />
        </RequireAuth>
      } />
      
      <Route path="/restaurant/:id" element={
        <RequireAuth>
          <DesktopRestaurantDetailPage />
        </RequireAuth>
      } />
      
      <Route path="/user/:userId" element={
        <RequireAuth>
          <DesktopUserProfilePage />
        </RequireAuth>
      } />
      
      <Route path="/friend/:friendId" element={
        <RequireAuth>
          <DesktopFriendProfilePage />
        </RequireAuth>
      } />
      
      <Route path="/itinerary" element={
        <RequireAuth>
          <DesktopItineraryPage />
        </RequireAuth>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}