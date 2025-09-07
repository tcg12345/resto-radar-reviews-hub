import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import ActivityRecommendations from '@/components/ActivityRecommendations';
import { useIsMobile } from '@/hooks/useIsMobile';

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
  const isMobile = useIsMobile();

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
        <div className="w-full h-[85vh] flex flex-col">
          {/* Header Section */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/95 px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="space-y-1">
                <DrawerTitle className="text-xl font-bold text-foreground">
                  Discover Activities in {city || 'Your Destination'}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-muted-foreground font-medium">
                  Find points of interest and activities for your trip
                </DrawerDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6">
            <ActivityRecommendations 
              latitude={latitude} 
              longitude={longitude} 
              city={city} 
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}