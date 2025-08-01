import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Users, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RestaurantPhoto {
  id: string;
  url: string;
  caption?: string;
  dishName?: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  createdAt: string;
  helpfulCount: number;
}

export default function RestaurantPhotosPage() {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const friendId = searchParams.get('friendId');
  const placeId = searchParams.get('placeId');
  
  const [friendPhotos, setFriendPhotos] = useState<RestaurantPhoto[]>([]);
  const [allPhotos, setAllPhotos] = useState<RestaurantPhoto[]>([]);
  const [friendName, setFriendName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friend' | 'all'>('friend');

  useEffect(() => {
    if (restaurantId) {
      loadPhotos();
    }
  }, [restaurantId, friendId, placeId]);

  const loadPhotos = async () => {
    try {
      setIsLoading(true);

      // Load friend's photos first
      if (friendId) {
        await loadFriendPhotos();
      }

      // Load all community photos if we have a place_id
      if (placeId) {
        await loadAllPhotos();
      }
    } catch (error) {
      console.error('Error loading photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendPhotos = async () => {
    if (!friendId) return;

    try {
      // Get friend's restaurant entry and photos
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('photos, photo_captions, photo_dish_names, user_id')
        .eq('id', restaurantId)
        .eq('user_id', friendId)
        .single();

      if (restaurantError) throw restaurantError;

      // Set default friend name
      let displayName = 'Friend';

      // Format friend's photos
      if (restaurantData && restaurantData.photos && Array.isArray(restaurantData.photos)) {
        const photos: RestaurantPhoto[] = restaurantData.photos.map((url: string, index: number) => ({
          id: `friend-${index}`,
          url,
          caption: Array.isArray(restaurantData.photo_captions) ? restaurantData.photo_captions[index] || '' : '',
          dishName: Array.isArray(restaurantData.photo_dish_names) ? restaurantData.photo_dish_names[index] || '' : '',
          userId: friendId,
          username: 'friend',
          userDisplayName: displayName,
          createdAt: new Date().toISOString(),
          helpfulCount: 0
        }));
        
        setFriendPhotos(photos);
      }

      setFriendName(displayName);
    } catch (error) {
      console.error('Error loading friend photos:', error);
    }
  };

  const loadAllPhotos = async () => {
    if (!placeId) return;

    try {
      // Get all community photos for this place
      const { data, error } = await supabase.rpc('get_restaurant_community_stats', {
        place_id_param: placeId
      });

      if (error) throw error;

      if (data && data[0]?.recent_photos && Array.isArray(data[0].recent_photos)) {
        const communityPhotos: RestaurantPhoto[] = data[0].recent_photos.map((photo: any, index: number) => ({
          id: `community-${photo.review_id}-${index}`,
          url: Array.isArray(photo.photos) ? photo.photos[0] || '' : '',
          caption: Array.isArray(photo.captions) ? photo.captions[0] || '' : '',
          dishName: Array.isArray(photo.dish_names) ? photo.dish_names[0] || '' : '',
          userId: photo.user_id,
          username: photo.username,
          userDisplayName: photo.username,
          createdAt: photo.created_at,
          helpfulCount: photo.helpful_count || 0
        })).filter((photo: RestaurantPhoto) => photo.url);

        setAllPhotos(communityPhotos);
      }
    } catch (error) {
      console.error('Error loading community photos:', error);
    }
  };

  const renderPhotoGrid = (photos: RestaurantPhoto[]) => {
    if (photos.length === 0) {
      return (
        <div className="text-center py-8">
          <div className="text-muted-foreground">No photos available</div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <div className="aspect-square relative">
              <img
                src={photo.url}
                alt={photo.dishName || 'Restaurant photo'}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-3">
              {photo.dishName && (
                <p className="font-medium text-sm mb-1">{photo.dishName}</p>
              )}
              {photo.caption && (
                <p className="text-xs text-muted-foreground mb-2">{photo.caption}</p>
              )}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {photo.userDisplayName || photo.username}
                </Badge>
                {photo.helpfulCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    👍 {photo.helpfulCount}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        {/* Mobile status bar spacer */}
        <div className="lg:hidden h-[35px] bg-background"></div>
        <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px] bg-background"></div>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-lg">Restaurant Photos</h1>
        </div>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'friend' | 'all')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friend" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {friendName} ({friendPhotos.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Users ({allPhotos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friend" className="mt-6">
            {renderPhotoGrid(friendPhotos)}
          </TabsContent>

          <TabsContent value="all" className="mt-6">
            {renderPhotoGrid(allPhotos)}
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </>
  );
}