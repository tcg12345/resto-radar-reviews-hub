import { useIsMobile } from '@/hooks/useIsMobile';
import { FriendsPage } from '@/pages/FriendsPage';
import { MobileProfilePage } from '@/components/mobile/MobileProfilePage';

interface ProfilePageWrapperProps {
  initialViewFriendId?: string | null;
  onInitialViewProcessed?: () => void;
}

export function ProfilePageWrapper({ 
  initialViewFriendId, 
  onInitialViewProcessed 
}: ProfilePageWrapperProps = {}) {
  const isMobile = useIsMobile();
  
  console.log('ProfilePageWrapper - isMobile:', isMobile, 'window.innerWidth:', window.innerWidth);
  
  if (isMobile) {
    return <MobileProfilePage />;
  }
  
  return (
    <FriendsPage 
      initialViewFriendId={initialViewFriendId} 
      onInitialViewProcessed={onInitialViewProcessed}
    />
  );
}