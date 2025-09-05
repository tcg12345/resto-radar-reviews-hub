import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/useIsMobile';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  
  const [departureDate, setDepartureDate] = useState<Date>();
  const [fromAirport, setFromAirport] = useState<string>("");
  const [toAirport, setToAirport] = useState<string>("");
  
  const isMobile = useIsMobile();
  
  const popularAirports = [
    { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York' },
    { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles' },
    { code: 'LHR', name: 'London Heathrow Airport', city: 'London' },
    { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris' },
    { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai' },
    { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo' },
    { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco' },
    { code: 'ORD', name: 'Chicago O\'Hare International Airport', city: 'Chicago' },
    { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta' },
    { code: 'MIA', name: 'Miami International Airport', city: 'Miami' },
    { code: 'LAS', name: 'Harry Reid International Airport', city: 'Las Vegas' },
    { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle' },
  ];
  
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
                    <Select value={fromAirport} onValueChange={setFromAirport}>
                      <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder="Select departure airport" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {popularAirports.map((airport) => (
                          <SelectItem key={airport.code} value={airport.code}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{airport.code} - {airport.city}</span>
                              <span className="text-xs text-muted-foreground">{airport.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">To Airport</label>
                    <Select value={toAirport} onValueChange={setToAirport}>
                      <SelectTrigger className="w-full h-12">
                        <SelectValue placeholder="Select destination airport" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {popularAirports.map((airport) => (
                          <SelectItem key={airport.code} value={airport.code}>
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{airport.code} - {airport.city}</span>
                              <span className="text-xs text-muted-foreground">{airport.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-normal",
                            !departureDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={departureDate}
                          onSelect={setDepartureDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
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
              <Select value={fromAirport} onValueChange={setFromAirport}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Select departure airport" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {popularAirports.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{airport.code} - {airport.city}</span>
                        <span className="text-xs text-muted-foreground">{airport.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">To Airport</label>
              <Select value={toAirport} onValueChange={setToAirport}>
                <SelectTrigger className="w-full h-12">
                  <SelectValue placeholder="Select destination airport" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {popularAirports.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{airport.code} - {airport.city}</span>
                        <span className="text-xs text-muted-foreground">{airport.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Departure Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !departureDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {departureDate ? format(departureDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={departureDate}
                  onSelect={setDepartureDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
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