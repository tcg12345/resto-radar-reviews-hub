import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Target } from 'lucide-react';
import { RatedRestaurantCard } from '@/components/RatedRestaurantCard';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Restaurant } from '@/types/restaurant';

export default function RatedRestaurantsRankingPage() {
  const navigate = useNavigate();
  const { restaurants, updateRestaurant } = useRestaurants();
  const [rankedRestaurants, setRankedRestaurants] = useState<Restaurant[]>([]);

  // Filter and sort rated restaurants
  useEffect(() => {
    const ratedRestaurants = restaurants.filter(r => !r.isWishlist && r.rating && r.rating > 0);
    
    // Sort by custom rank first, then by rating (highest to lowest)
    const sorted = ratedRestaurants.sort((a, b) => {
      // If both have custom ranks, sort by rank
      if (a.customRank !== undefined && b.customRank !== undefined) {
        return a.customRank - b.customRank;
      }
      // If only one has custom rank, it goes first
      if (a.customRank !== undefined) return -1;
      if (b.customRank !== undefined) return 1;
      // Otherwise sort by rating (highest first)
      return (b.rating || 0) - (a.rating || 0);
    });

    setRankedRestaurants(sorted);
  }, [restaurants]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = rankedRestaurants.findIndex(r => r.id === active.id);
    const newIndex = rankedRestaurants.findIndex(r => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newRankedRestaurants = arrayMove(rankedRestaurants, oldIndex, newIndex);
    setRankedRestaurants(newRankedRestaurants);

    // Update custom ranks for all restaurants
    const updates = newRankedRestaurants.map(async (restaurant, index) => {
      const updatedData = {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        country: restaurant.country,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        categoryRatings: restaurant.categoryRatings,
        useWeightedRating: restaurant.useWeightedRating,
        priceRange: restaurant.priceRange,
        michelinStars: restaurant.michelinStars,
        photos: [], // Empty since we're not updating photos
        photoDishNames: restaurant.photoDishNames,
        photoNotes: restaurant.photoNotes,
        notes: restaurant.notes,
        dateVisited: restaurant.dateVisited,
        isWishlist: restaurant.isWishlist,
        customRank: index + 1,
        phone_number: restaurant.phone_number,
      };
      return updateRestaurant(restaurant.id, updatedData);
    });

    await Promise.all(updates);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">Your Restaurant Rankings</h1>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 border border-dashed">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Drag to Reorder</p>
                <p className="text-xs text-muted-foreground">
                  Your restaurants are initially sorted by rating. Drag and drop to reorder them based on your personal preference.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rankings List */}
        {rankedRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Rated Restaurants Yet</h2>
            <p className="text-muted-foreground mb-4">
              Start rating restaurants to see your personal rankings here.
            </p>
            <Button onClick={() => navigate('/places')}>
              Rate Your First Restaurant
            </Button>
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rankedRestaurants.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {rankedRestaurants.map((restaurant, index) => (
                  <RatedRestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    rank={index + 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Footer */}
        {rankedRestaurants.length > 0 && (
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/places')}
            >
              Rate More Restaurants
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
