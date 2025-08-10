import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ItineraryBuilder, Itinerary } from '@/components/ItineraryBuilder';
import { TripPlanner } from '@/components/TripPlanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin } from 'lucide-react';

export default function TravelPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'itinerary';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [itineraryBuilderKey, setItineraryBuilderKey] = useState(0);

  const handleLoadItinerary = (itinerary: Itinerary) => {
    // Clear current itinerary builder state and load the selected one
    localStorage.setItem('currentItineraryBuilder', JSON.stringify({
      dateRange: {
        start: itinerary.startDate,
        end: itinerary.endDate,
      },
      currentItinerary: itinerary,
      events: itinerary.events,
      locations: itinerary.locations,
      isMultiCity: itinerary.isMultiCity,
      hasCreatedItinerary: true,
    }));
    
    // Force re-render of ItineraryBuilder and switch to it
    setItineraryBuilderKey(prev => prev + 1);
    setActiveTab('itinerary');
  };

  return (
    <div className="w-full h-full min-h-screen">
      <div className="w-full max-w-none px-4 lg:px-6 py-6">
        <div className="mb-8 hidden lg:block">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Travel Planner
          </h1>
          <p className="text-muted-foreground">
            Plan trips, rate places you've visited, and create detailed itineraries
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl border border-border bg-muted/40 p-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-muted/30">
            <TabsTrigger
              value="itinerary"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>Itinerary Builder</span>
            </TabsTrigger>
            <TabsTrigger
              value="trip-planner"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <MapPin className="w-4 h-4" />
              <span>Trip Planner</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="itinerary" className="mt-6">
            <ItineraryBuilder key={itineraryBuilderKey} onLoadItinerary={handleLoadItinerary} />
          </TabsContent>
          
          <TabsContent value="trip-planner" className="mt-6">
            <TripPlanner />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}