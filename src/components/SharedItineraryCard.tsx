import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';

interface SharedItinerary {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  events: Array<{
    id: string;
    date: string;
    time: string;
    title: string;
    restaurantData?: any;
    attractionData?: any;
  }>;
  message?: string;
}

interface SharedItineraryCardProps {
  itineraryData: string;
  isOwnMessage: boolean;
}

export function SharedItineraryCard({ itineraryData, isOwnMessage }: SharedItineraryCardProps) {
  const navigate = useNavigate();

  const handleViewItinerary = () => {
    const data = encodeURIComponent(itineraryData);
    navigate(`/shared-itinerary?data=${data}`);
  };
  
  let itinerary: SharedItinerary;
  try {
    itinerary = JSON.parse(itineraryData);
  } catch (error) {
    console.error('Failed to parse itinerary data:', error);
    return (
      <div className="text-sm text-muted-foreground italic">
        Invalid itinerary data
      </div>
    );
  }

  const getDuration = () => {
    const start = new Date(itinerary.startDate);
    const end = new Date(itinerary.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const getEventCount = () => {
    return itinerary.events.length;
  };

  const getUniqueLocations = () => {
    const locations = new Set();
    itinerary.events.forEach(event => {
      if (event.restaurantData?.city) {
        locations.add(event.restaurantData.city);
      }
      if (event.attractionData?.city) {
        locations.add(event.attractionData.city);
      }
    });
    return Array.from(locations).slice(0, 2);
  };

  return (
    <>
      <Card 
        className={`cursor-pointer hover:shadow-md transition-all duration-200 max-w-sm ${
          isOwnMessage ? 'bg-primary/10 border-primary/20' : ''
        }`}
        onClick={handleViewItinerary}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{itinerary.title}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(new Date(itinerary.startDate), 'MMM d')} - {format(new Date(itinerary.endDate), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal message */}
            {itinerary.message && (
              <div className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                "{itinerary.message}"
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {getDuration()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getEventCount()} events
              </Badge>
              {getUniqueLocations().length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {getUniqueLocations().join(', ')}
                </Badge>
              )}
            </div>

            {/* Action */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                Click to view details
              </span>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewItinerary();
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}