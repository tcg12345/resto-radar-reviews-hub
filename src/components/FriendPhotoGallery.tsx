import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, User, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FriendPhoto {
  url: string;
  caption?: string;
  dishName?: string;
}

interface FriendPhotoGalleryProps {
  friendPhotos: FriendPhoto[];
  friendName: string;
  friendId: string;
  restaurantId: string;
  restaurantPlaceId?: string;
}

export function FriendPhotoGallery({
  friendPhotos,
  friendName,
  friendId,
  restaurantId,
  restaurantPlaceId
}: FriendPhotoGalleryProps) {
  const navigate = useNavigate();

  const handleViewAllPhotos = () => {
    // Navigate to photo gallery page with friend's photos
    navigate(`/restaurant/${restaurantId}/photos?friendId=${friendId}&placeId=${restaurantPlaceId}`);
  };

  if (!friendPhotos || friendPhotos.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Photos by {friendName}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {friendPhotos.length} photo{friendPhotos.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Photo Grid */}
        <div className="grid grid-cols-2 gap-2">
          {friendPhotos.slice(0, 4).map((photo, index) => (
            <div
              key={index}
              className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group"
              onClick={handleViewAllPhotos}
            >
              <img
                src={photo.url}
                alt={photo.dishName || `Photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {photo.dishName && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                  <p className="text-xs font-medium truncate">{photo.dishName}</p>
                </div>
              )}
              {index === 3 && friendPhotos.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-lg font-bold">+{friendPhotos.length - 4}</div>
                    <div className="text-xs">more</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View All Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleViewAllPhotos}
        >
          <Camera className="h-4 w-4 mr-2" />
          View All Photos
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}