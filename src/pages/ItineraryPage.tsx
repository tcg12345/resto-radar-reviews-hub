import { useState } from 'react';
import { ItineraryBuilder } from '@/components/ItineraryBuilder';
import { TravelDestinationDiscovery } from '@/components/TravelDestinationDiscovery';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plane } from 'lucide-react';

export default function ItineraryPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8 hidden lg:block">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Trip Itinerary Builder
        </h1>
        <p className="text-muted-foreground">
          Plan your perfect trip with restaurants, activities, and travel destinations
        </p>
      </div>
      
      <Tabs defaultValue="itinerary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="itinerary" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Build Itinerary
          </TabsTrigger>
          <TabsTrigger value="discover" className="flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Discover Destinations
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="itinerary">
          <ItineraryBuilder />
        </TabsContent>
        
        <TabsContent value="discover">
          <TravelDestinationDiscovery />
        </TabsContent>
      </Tabs>
    </div>
  );
}