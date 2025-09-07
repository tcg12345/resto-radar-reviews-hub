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
  city 
}: ActivityRecommendationsDialogProps) {
  return (
    <BottomSheet open={isOpen} onOpenChange={onClose}>
      <BottomSheetContent className="h-[90vh] overflow-hidden flex flex-col">
        <BottomSheetHeader className="flex-shrink-0 pb-4">
          <h2 className="text-2xl font-bold text-center">
            Discover Activities in {city || 'Your Destination'}
          </h2>
        </BottomSheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <ActivityRecommendations 
            latitude={latitude} 
            longitude={longitude} 
            city={city} 
          />
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}