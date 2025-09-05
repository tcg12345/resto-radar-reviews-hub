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
        <DrawerContent 
          className="h-[90vh] bg-red-500 border-4 border-yellow-500"
          style={{ 
            backgroundColor: 'red !important',
            border: '10px solid yellow !important',
            zIndex: 99999
          }}
        >
          <div className="p-8">
            <DrawerTitle className="text-2xl font-bold text-white mb-4">
              🛩️ ENHANCED FLIGHT SEARCH - TEST VERSION
            </DrawerTitle>
            
            <div className="bg-white p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Flight Search Form</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">From Airport</label>
                  <input 
                    type="text" 
                    placeholder="Enter departure airport" 
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">To Airport</label>
                  <input 
                    type="text" 
                    placeholder="Enter destination airport" 
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Departure Date</label>
                  <input 
                    type="date" 
                    className="w-full p-3 border rounded-lg"
                  />
                </div>
                
                <Button 
                  onClick={() => {
                    console.log('🛩️ SEARCH BUTTON CLICKED!');
                    alert('Search button clicked! This proves the component is working.');
                  }}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  🔍 SEARCH FLIGHTS (TEST)
                </Button>
                
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  Close Dialog
                </Button>
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
      <DialogContent 
        className="max-w-4xl bg-red-500 border-4 border-yellow-500"
        style={{ 
          backgroundColor: 'red !important',
          border: '10px solid yellow !important',
          zIndex: 99999
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            🛩️ ENHANCED FLIGHT SEARCH - DESKTOP TEST
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Flight Search Form (Desktop)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">From Airport</label>
              <input 
                type="text" 
                placeholder="Enter departure airport" 
                className="w-full p-3 border rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">To Airport</label>
              <input 
                type="text" 
                placeholder="Enter destination airport" 
                className="w-full p-3 border rounded-lg"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Departure Date</label>
            <input 
              type="date" 
              className="w-full p-3 border rounded-lg"
            />
          </div>
          
          <div className="mt-6 space-y-2">
            <Button 
              onClick={() => {
                console.log('🛩️ SEARCH BUTTON CLICKED!');
                alert('Search button clicked! This proves the component is working.');
              }}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              🔍 SEARCH FLIGHTS (TEST)
            </Button>
            
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Close Dialog
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}