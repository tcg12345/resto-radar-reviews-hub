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
    <div className="w-full h-full min-h-screen overflow-x-hidden">
      {/* Compact Mobile-Optimized Container */}
      <div className="w-full max-w-7xl mx-auto px-2 lg:px-6 py-2 lg:py-6">
        {/* Premium Header - Hidden on mobile, enhanced on desktop */}
        <div className="mb-4 lg:mb-8 hidden lg:block">
          <div className="text-center space-y-4">
            <h1 className="text-4xl lg:text-6xl font-bold text-gradient mb-4">
              Travel Planner
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground/80 max-w-2xl mx-auto font-medium">
              Plan incredible trips, rate amazing places, and create detailed itineraries
            </p>
          </div>
        </div>
        
        {/* Ultra-Premium Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-4 lg:mb-8">
            <TabsList className="grid grid-cols-2 bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl p-1.5 shadow-premium-xl h-auto">
              <TabsTrigger 
                value="itinerary" 
                className="flex items-center gap-2 px-4 lg:px-8 py-3 lg:py-4 rounded-2xl font-bold text-sm lg:text-base transition-all duration-500 data-[state=active]:bg-gradient-premium data-[state=active]:text-primary-foreground data-[state=active]:shadow-premium-glow data-[state=active]:scale-105"
              >
                <Calendar className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>Plan Trip</span>
              </TabsTrigger>
              <TabsTrigger 
                value="trip-planner" 
                className="flex items-center gap-2 px-4 lg:px-8 py-3 lg:py-4 rounded-2xl font-bold text-sm lg:text-base transition-all duration-500 data-[state=active]:bg-gradient-premium data-[state=active]:text-primary-foreground data-[state=active]:shadow-premium-glow data-[state=active]:scale-105"
              >
                <MapPin className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>My Trips</span>
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