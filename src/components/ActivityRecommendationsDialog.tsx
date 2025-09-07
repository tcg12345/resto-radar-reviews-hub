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
    <BottomSheet 
      open={isOpen} 
      onOpenChange={onClose}
      className="min-h-[50vh] max-h-[90vh]"
    >
      <div 
        className="bg-background border rounded-t-3xl p-6"
        style={{ 
          minHeight: '300px',
          backgroundColor: 'white',
          borderRadius: '24px 24px 0 0'
        }}
      >
        <h2 className="text-xl font-semibold text-center mb-4">
          Discover Activities in {city || 'Your Destination'}
        </h2>
        <ActivityRecommendations 
          latitude={latitude} 
          longitude={longitude} 
          city={city} 
        />
      </div>
    </BottomSheet>
  );
}