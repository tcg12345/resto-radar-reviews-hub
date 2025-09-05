import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useIsMobile';

interface TripLocation {
  id: string;
  name: string;
  country: string;
  state?: string;
  startDate?: Date;
  endDate?: Date;
}

interface EnhancedFlightSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (flight: any) => void;
  locations: TripLocation[];
}

export function EnhancedFlightSearchDialog({ isOpen, onClose, onSelect, locations }: EnhancedFlightSearchDialogProps) {
  console.log('🛩️ EnhancedFlightSearchDialog DEFINITELY RENDERING - isOpen:', isOpen);
  console.log('🛩️ Locations:', locations);
  
  const isMobile = useIsMobile();
  
  if (isMobile) {
    console.log('🛩️ Rendering MOBILE version');
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="h-[90vh] bg-background border-border">
          <div className="p-6 h-full flex flex-col">
            <DrawerTitle className="text-2xl font-bold text-foreground mb-6">
              ✈️ Flight Search
            </DrawerTitle>
            
            <div className="flex-1 space-y-6 overflow-y-auto">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">From Airport</label>
                    <input 
                      type="text" 
                      placeholder="Enter departure airport" 
                      className="w-full p-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">To Airport</label>
                    <input 
                      type="text" 
                      placeholder="Enter destination airport" 
                      className="w-full p-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => {
                      console.log('🛩️ SEARCH BUTTON CLICKED!');
                      alert('Search button clicked! This proves the component is working.');
                    }}
                    className="w-full h-12"
                  >
                    ✈️ Search Flights
                  </Button>
                  
                  <Button 
                    onClick={onClose}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop version
  console.log('🛩️ Rendering DESKTOP version');
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            ✈️ Flight Search
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">From Airport</label>
              <input 
                type="text" 
                placeholder="Enter departure airport" 
                className="w-full p-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">To Airport</label>
              <input 
                type="text" 
                placeholder="Enter destination airport" 
                className="w-full p-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
            <input 
              type="date" 
              className="w-full p-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => {
                console.log('🛩️ SEARCH BUTTON CLICKED!');
                alert('Search button clicked! This proves the component is working.');
              }}
              className="w-full h-12"
            >
              ✈️ Search Flights
            </Button>
            
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}