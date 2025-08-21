import { useIsMobile } from '@/hooks/useIsMobile';
import DesktopProfilePage from '@/components/desktop/DesktopProfilePage';
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
  
  return <MobileProfilePage />;
}
