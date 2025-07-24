import { ItineraryBuilder } from '@/components/ItineraryBuilder';
import { TripPlanner } from '@/components/TripPlanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin } from 'lucide-react';

export default function TravelPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8 hidden lg:block">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Travel Planner
        </h1>
        <p className="text-muted-foreground">
          Plan trips, rate places you've visited, and create detailed itineraries
        </p>
      </div>
      
      <Tabs defaultValue="itinerary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
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
          <ItineraryBuilder />
        </TabsContent>
        
        <TabsContent value="trip-planner" className="mt-6">
          <TripPlanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}