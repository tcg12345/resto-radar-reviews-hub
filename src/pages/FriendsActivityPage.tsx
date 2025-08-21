import React from 'react';
import { ModernFriendsActivityPage } from '@/components/ModernFriendsActivityPage';
import { MobileFriendsActivityPage } from '@/components/mobile/MobileFriendsActivityPage';
import { useIsMobile } from '@/hooks/useIsMobile';

export function FriendsActivityPage() {
  const isMobile = useIsMobile();
  
  return isMobile ? <MobileFriendsActivityPage /> : <ModernFriendsActivityPage />;
}