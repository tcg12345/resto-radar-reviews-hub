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
      <div className="bg-red-500 text-white p-8 text-center">
        <h2 className="text-2xl font-bold">
          TEST: Activities for {city}
        </h2>
        <p>If you can see this red box, the BottomSheet is working!</p>
      </div>
    </BottomSheet>
  );
}