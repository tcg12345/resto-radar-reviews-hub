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
  console.log('ActivityRecommendationsDialog render:', { isOpen, latitude, longitude, city });
  
  return (
    <BottomSheet open={isOpen} onOpenChange={onClose}>
      <BottomSheetHeader className="px-4 py-4 border-b bg-background/95 backdrop-blur rounded-t-3xl">
        <h2 className="text-xl font-semibold text-center">
          Discover Activities in {city || 'Your Destination'}
        </h2>
      </BottomSheetHeader>
      <BottomSheetContent className="p-0">
        <div className="p-4">
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