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
        if (!open) onClose();
      }}
    >
      <BottomSheetContent className="min-h-[50vh] max-h-[90vh] rounded-t-3xl p-6 bg-white">
        <BottomSheetHeader>
          <h2 className="text-xl font-semibold text-center">
            Discover Activities in {city || 'Your Destination'}
          </h2>
        </BottomSheetHeader>

        <ActivityRecommendations latitude={latitude} longitude={longitude} city={city} />
      </BottomSheetContent>
    </BottomSheet>
  );
}