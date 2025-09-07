import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold text-center">
            Discover Activities in {city || 'Your Destination'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <ActivityRecommendations 
            latitude={latitude} 
            longitude={longitude} 
            city={city} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}