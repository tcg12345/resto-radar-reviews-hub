import { useState } from 'react';
import { ItineraryBuilder } from '@/components/ItineraryBuilder';

export default function ItineraryPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Trip Itinerary Builder
        </h1>
        <p className="text-muted-foreground">
          Plan your perfect trip with restaurants, activities, and more
        </p>
      </div>
      
      <ItineraryBuilder />
    </div>
  );
}