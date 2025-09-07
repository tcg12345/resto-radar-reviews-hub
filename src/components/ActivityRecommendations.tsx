import { useState, useEffect } from 'react';
import { MapPin, Star, Clock, DollarSign, Users, Calendar, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PointOfInterest {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  type: string;
  geoCode: {
    latitude: number;
    longitude: number;
  };
  rank?: number;
  tags?: string[];
}

interface TourActivity {
  id: string;
  name: string;
  description?: string;
  geoCode: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  pictures?: string[];
  bookingLink?: string;
  price?: {
    amount: string;
    currencyCode: string;
  };
  minimumDuration?: string;
  supplier: {
    name: string;
  };
}

interface ActivityRecommendationsProps {
  latitude?: number;
  longitude?: number;
  city?: string;
}

export default function ActivityRecommendations({ 
  latitude, 
  longitude, 
  city 
}: ActivityRecommendationsProps) {
  console.log('🏛️ ActivityRecommendations received coordinates:', { latitude, longitude, city });
  
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterest[]>([]);
  const [toursActivities, setToursActivities] = useState<TourActivity[]>([]);
  const [isLoadingPOI, setIsLoadingPOI] = useState(false);
  const [isLoadingTours, setIsLoadingTours] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  // Don't proceed without coordinates
  if (!latitude || !longitude) {
    console.warn('🚨 ActivityRecommendations: No coordinates provided');
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Waiting for location coordinates...</p>
      </div>
    );
  }

  const fetchPointsOfInterest = async () => {
    console.log('🔍 Fetching POI with coordinates:', { latitude, longitude, city, selectedCategory });
    setIsLoadingPOI(true);
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'points-of-interest',
          latitude,
          longitude,
          radius: 5,
          category: selectedCategory === 'all' ? undefined : selectedCategory
        }
      });

      if (error) throw error;
      console.log('POI API Response:', data);
      setPointsOfInterest(data?.data || []);
    } catch (error) {
      console.error('Error fetching points of interest:', error);
      toast({
        title: "Error",
        description: "Failed to load points of interest",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPOI(false);
    }
  };

  const fetchToursActivities = async () => {
    console.log('🎯 Fetching Tours & Activities with coordinates:', { latitude, longitude, city });
    setIsLoadingTours(true);
    try {
      const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
        body: {
          endpoint: 'tours-activities',
          latitude,
          longitude,
          radius: 5
        }
      });

      if (error) throw error;
      console.log('Tours & Activities API Response:', data);
      setToursActivities(data?.data || []);
    } catch (error) {
      console.error('Error fetching tours and activities:', error);
      toast({
        title: "Error", 
        description: "Failed to load tours and activities",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTours(false);
    }
  };

  useEffect(() => {
    fetchPointsOfInterest();
    fetchToursActivities();
  }, [latitude, longitude, selectedCategory]);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'SIGHTS', label: 'Sights' },
    { value: 'RESTAURANT', label: 'Restaurants' },
    { value: 'NIGHTLIFE', label: 'Nightlife' },
    { value: 'SHOPPING', label: 'Shopping' },
    { value: 'OUTDOOR', label: 'Outdoor' }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">
          Discover {city}
        </h2>
        <p className="text-muted-foreground">
          Find amazing places to visit and exciting activities to try
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.value)}
            className="rounded-full"
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="points-of-interest" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30 rounded-2xl">
          <TabsTrigger value="points-of-interest" className="rounded-xl">
            <MapPin className="w-4 h-4 mr-2" />
            Points of Interest
          </TabsTrigger>
          <TabsTrigger value="tours-activities" className="rounded-xl">
            <Calendar className="w-4 h-4 mr-2" />
            Tours & Activities
          </TabsTrigger>
        </TabsList>

        {/* Points of Interest Tab */}
        <TabsContent value="points-of-interest" className="space-y-4">
          {isLoadingPOI ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pointsOfInterest.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pointsOfInterest.map((poi) => (
                <Card key={poi.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{poi.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {poi.category}
                      </Badge>
                      {poi.rank && (
                        <div className="flex items-center text-primary">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          <span className="text-xs font-medium">#{poi.rank}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {poi.subCategory && (
                        <p className="text-sm text-muted-foreground">{poi.subCategory}</p>
                      )}
                      {poi.tags && poi.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {poi.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center text-muted-foreground text-xs">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span>
                          {poi.geoCode?.latitude?.toFixed(4) || 'N/A'}, {poi.geoCode?.longitude?.toFixed(4) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No points of interest found for this location.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tours & Activities Tab */}
        <TabsContent value="tours-activities" className="space-y-4">
          {isLoadingTours ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-24 bg-muted rounded mb-4"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : toursActivities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {toursActivities.filter(activity => activity && activity.name).map((activity) => (
                <Card key={activity.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl line-clamp-2">{activity.name || 'Unknown Activity'}</CardTitle>
                    <div className="flex items-center gap-2">
                      {activity.rating && (
                        <div className="flex items-center text-primary">
                          <Star className="w-4 h-4 mr-1 fill-current" />
                          <span className="font-medium">{activity.rating}</span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {activity.supplier?.name || 'Unknown Supplier'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activity.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {activity.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {activity.price && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            <span>{activity.price.amount} {activity.price.currencyCode}</span>
                          </div>
                        )}
                        {activity.minimumDuration && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>{activity.minimumDuration}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {activity.bookingLink && (
                      <Button 
                        className="w-full" 
                        onClick={() => window.open(activity.bookingLink, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Book Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No tours and activities found for this location.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}