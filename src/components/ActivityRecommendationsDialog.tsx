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
  if (!isOpen) return null;
  
  return (
    <BottomSheet open={isOpen} onOpenChange={onClose}>
      <div className="h-[90vh] flex flex-col">
        <div className="flex-shrink-0 px-4 pt-4 pb-2">
          <h2 className="text-2xl font-bold text-center">
            Discover Activities in {city || 'Your Destination'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <ActivityRecommendations 
            latitude={latitude} 
            longitude={longitude} 
            city={city} 
          />
        </div>
      </div>
    </BottomSheet>
  );
}