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
    <div className="w-full h-full min-h-screen bg-gradient-subtle">
      <div className="w-full max-w-none px-3 lg:px-6 py-4 lg:py-6">
        {/* Header - Hidden on mobile, visible on desktop */}
        <div className="mb-6 lg:mb-8 hidden lg:block">
          <div className="text-center space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold text-gradient mb-3">
              Travel Planner
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Plan incredible trips, rate amazing places, and create detailed itineraries
            </p>
          </div>
        </div>
        
        {/* Premium Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-6 lg:mb-8">
            <TabsList className="grid grid-cols-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-1.5 shadow-premium">
              <TabsTrigger 
                value="itinerary" 
                className="flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-3.5 rounded-xl font-medium text-sm lg:text-base transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <Calendar className="w-4 h-4 lg:w-5 lg:h-5" />
                Plan Trip
              </TabsTrigger>
              <TabsTrigger 
                value="trip-planner" 
                className="flex items-center gap-2 px-6 lg:px-8 py-3 lg:py-3.5 rounded-xl font-medium text-sm lg:text-base transition-all duration-300 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
              >
                <MapPin className="w-4 h-4 lg:w-5 lg:h-5" />
                My Trips
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="itinerary" className="mt-0 animate-fade-in-up">
            <ItineraryBuilder key={itineraryBuilderKey} onLoadItinerary={handleLoadItinerary} />
          </TabsContent>
          
          <TabsContent value="trip-planner" className="mt-0 animate-fade-in-up">
            <TripPlanner />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}