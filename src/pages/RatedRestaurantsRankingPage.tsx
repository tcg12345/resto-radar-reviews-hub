import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Target } from 'lucide-react';
import { RatedRestaurantCard } from '@/components/RatedRestaurantCard';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Restaurant } from '@/types/restaurant';

function sortByRankThenRating(list: Restaurant[]) {
  // never mutate the input
  return [...list]
    .filter(r => !r.isWishlist && r.rating && r.rating > 0)
    .sort((a, b) => {
      const aRank = a.customRank;
      const bRank = b.customRank;
      if (aRank != null && bRank != null) return aRank - bRank;
      if (aRank != null) return -1;
      if (bRank != null) return 1;
      return (b.rating || 0) - (a.rating || 0); // highest rating first
    });
}

export default function RatedRestaurantsRankingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurants, updateRestaurant } = useRestaurants();

  // Get newly added restaurant ID from navigation state
  const newlyAddedRestaurantId = location.state?.newlyAddedRestaurantId;

  // A *local* ordered list we can optimistically update
  const [rankedRestaurants, setRankedRestaurants] = useState<Restaurant[]>([]);
  // While we're pushing ranks to the server/context, don't let remote refresh overwrite the local order
  const isSyncingRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Compute the canonical "remote" order for when we want to refresh local state
  const remoteOrdered = useMemo(() => sortByRankThenRating(restaurants), [restaurants]);

  // Initialize/refresh local order, but *not* while we're in the middle of a drag/save cycle
  useEffect(() => {
    if (isSyncingRef.current || isDraggingRef.current) return;

    const localIds = rankedRestaurants.map(r => r.id);
    const remoteIds = remoteOrdered.map(r => r.id);
    // Only replace if different to avoid unnecessary rerenders
    if (JSON.stringify(localIds) !== JSON.stringify(remoteIds)) {
      setRankedRestaurants(remoteOrdered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteOrdered]); // intentionally not depending on rankedRestaurants

  const persistCustomRanks = async (ordered: Restaurant[]) => {
    // Persist only rows whose rank actually changed
    const updates = ordered.map((r, idx) => {
      const nextRank = idx + 1;
      return r.customRank === nextRank ? null : { restaurant: r, customRank: nextRank };
    }).filter(Boolean) as { restaurant: Restaurant; customRank: number }[];

    if (updates.length === 0) return;

    // Mark syncing so incoming context updates won't clobber our local order
    isSyncingRef.current = true;
    try {
      await Promise.all(
        updates.map(({ restaurant, customRank }) => {
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
            photoDishNames: restaurant.photoDishNames?.slice(0, 50) || [], // Limit to prevent massive arrays
            photoNotes: restaurant.photoNotes?.slice(0, 50) || [], // Limit to prevent massive arrays
            notes: restaurant.notes,
            dateVisited: restaurant.dateVisited,
            isWishlist: restaurant.isWishlist,
            customRank: customRank,
            phone_number: restaurant.phone_number,
          };
          return updateRestaurant(restaurant.id, updatedData, true); // suppress toast notifications
        })
      );
      // when context pushes fresh data, our effect will reconcile (because isSyncingRef is about to be false)
    } finally {
      isSyncingRef.current = false;
    }
  };

  const handleDragStart = (evt: DragStartEvent) => {
    // Only allow dragging if it's the newly added restaurant
    if (newlyAddedRestaurantId && evt.active.id !== newlyAddedRestaurantId) {
      return;
    }
    isDraggingRef.current = true;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    isDraggingRef.current = false;

    // Only allow reordering if it's the newly added restaurant
    if (newlyAddedRestaurantId && active.id !== newlyAddedRestaurantId) {
      return;
    }

    if (!over || active.id === over.id) return;

    const oldIndex = rankedRestaurants.findIndex(r => r.id === active.id);
    const newIndex = rankedRestaurants.findIndex(r => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic UI first
    const next = arrayMove(rankedRestaurants, oldIndex, newIndex);
    setRankedRestaurants(next);

    // Calculate new rating based on position
    const draggedRestaurant = rankedRestaurants[oldIndex];
    if (newlyAddedRestaurantId && draggedRestaurant.id === newlyAddedRestaurantId) {
      const prevRestaurant = next[newIndex - 1];
      const nextRestaurant = next[newIndex + 1];
      
      let newRating = draggedRestaurant.rating || 0;
      
      if (prevRestaurant && nextRestaurant) {
        // Between two restaurants - average their ratings
        newRating = ((prevRestaurant.rating || 0) + (nextRestaurant.rating || 0)) / 2;
      } else if (prevRestaurant && !nextRestaurant) {
        // Moved to last position - slightly lower than the previous
        newRating = Math.max((prevRestaurant.rating || 0) - 0.1, 1);
      } else if (!prevRestaurant && nextRestaurant) {
        // Moved to first position - slightly higher than the next
        newRating = Math.min((nextRestaurant.rating || 0) + 0.1, 10);
      }
      
      // Update the restaurant with new rating
      const updatedRestaurant = { ...draggedRestaurant, rating: newRating };
      next[newIndex] = updatedRestaurant;
      setRankedRestaurants([...next]);
      
      // Update the restaurant in the context
      try {
        const updatedData = {
          name: updatedRestaurant.name,
          address: updatedRestaurant.address,
          city: updatedRestaurant.city,
          country: updatedRestaurant.country,
          cuisine: updatedRestaurant.cuisine,
          rating: newRating,
          categoryRatings: updatedRestaurant.categoryRatings,
          useWeightedRating: updatedRestaurant.useWeightedRating,
          priceRange: updatedRestaurant.priceRange,
          michelinStars: updatedRestaurant.michelinStars,
          photos: [], // Empty since we're not updating photos
          photoDishNames: updatedRestaurant.photoDishNames || [], // Ensure it's an array, not undefined
          photoNotes: updatedRestaurant.photoNotes || [], // Ensure it's an array, not undefined
          notes: updatedRestaurant.notes,
          dateVisited: updatedRestaurant.dateVisited,
          isWishlist: updatedRestaurant.isWishlist,
          customRank: newIndex + 1,
          phone_number: updatedRestaurant.phone_number,
        };
        await updateRestaurant(updatedRestaurant.id, updatedData, true);
      } catch (error) {
        console.error('Error updating restaurant rating:', error);
      }
    }

    // Then persist only the changed ranks
    persistCustomRanks(next).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-1 h-8 w-8">
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
                <p className="text-sm font-medium mb-1">
                  {newlyAddedRestaurantId ? 'Drag to Reorder Your New Restaurant' : 'Drag to Reorder'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {newlyAddedRestaurantId 
                    ? 'You can now reorder your newly rated restaurant. The highlighted restaurant can be moved to your preferred position.'
                    : 'Your restaurants are initially sorted by rating. Drag and drop to reorder them based on your personal preference.'
                  }
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
            <Button onClick={() => navigate('/places')}>Rate Your First Restaurant</Button>
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
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
                    isNewlyAdded={restaurant.id === newlyAddedRestaurantId}
                    isDraggable={!newlyAddedRestaurantId || restaurant.id === newlyAddedRestaurantId}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Footer */}
        {rankedRestaurants.length > 0 && (
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate('/places')}>
              Rate More Restaurants
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}