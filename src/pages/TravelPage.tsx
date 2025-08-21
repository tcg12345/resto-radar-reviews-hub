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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Premium Container with Full-Width Layout */}
      <div className="w-full px-4 lg:px-8 py-6 lg:py-12 max-w-7xl mx-auto">
        {/* Premium Header */}
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-5xl lg:text-7xl font-bold text-gradient mb-6 tracking-tight">
            Travel Planner
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto font-light leading-relaxed">
            Design incredible journeys with our intelligent travel companion
          </p>
        </div>
        
        {/* Modern Segmented Control Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-12">
            <div className="inline-flex bg-white/80 dark:bg-card/80 backdrop-blur-xl rounded-2xl p-2 shadow-xl border border-white/20 dark:border-border/20">
              <TabsList className="grid grid-cols-2 bg-transparent p-0 h-auto space-x-2">
                <TabsTrigger 
                  value="itinerary" 
                  className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] hover:bg-primary/10 data-[state=inactive]:text-muted-foreground"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Plan Trip</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="trip-planner" 
                  className="flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-300 ease-out data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:scale-[1.02] hover:bg-primary/10 data-[state=inactive]:text-muted-foreground"
                >
                  <MapPin className="w-5 h-5" />
                  <span>My Trips</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <TabsContent value="itinerary" className="mt-0">
            <div className="animate-fade-in-up">
              <ItineraryBuilder key={itineraryBuilderKey} onLoadItinerary={handleLoadItinerary} />
            </div>
          </TabsContent>
          
          <TabsContent value="trip-planner" className="mt-0">
            <div className="animate-fade-in-up">
              <TripPlanner />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}