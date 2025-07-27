import { useState } from 'react';
import { ItineraryBuilder, Itinerary } from '@/components/ItineraryBuilder';
import { TripPlanner } from '@/components/TripPlanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin } from 'lucide-react';

export default function TravelPage() {
  const [activeTab, setActiveTab] = useState('itinerary');
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
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="itinerary" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Itinerary Builder
            </TabsTrigger>
            <TabsTrigger value="trip-planner" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Trip Planner & Ratings
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