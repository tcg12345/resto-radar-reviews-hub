import { useState } from 'react';
import { BottomSheet, BottomSheetContent, BottomSheetHeader } from '@/components/ui/bottom-sheet';
import ActivityRecommendations from '@/components/ActivityRecommendations';

interface ActivityRecommendationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  latitude?: number;
  longitude?: number;
  city?: string;
}

export default function ActivityRecommendationsDialog({
  isOpen,
  onClose,
  latitude,
  longitude,
  city,
}: ActivityRecommendationsDialogProps) {
  console.log('ActivityRecommendationsDialog render:', { isOpen, latitude, longitude, city });

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(open) => {
        console.log('BottomSheet onOpenChange called with:', open);
        if (!open) onClose();
      }}
    >
      {/* Render content directly without BottomSheetContent wrapper */}
      <div className="px-4 pb-4 border-b bg-background">
        <h2 className="text-xl font-semibold text-center">
          Discover Activities in {city || 'Your Destination'}
        </h2>
      </div>
      
      <div className="px-4 py-4 min-h-[40vh]">
        <div>DEBUG: Content is rendering</div>
        <ActivityRecommendations latitude={latitude} longitude={longitude} city={city} />
      </div>
    </BottomSheet>
  );
}