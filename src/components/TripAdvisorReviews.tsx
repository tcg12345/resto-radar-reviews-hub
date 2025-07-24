import { useState, useEffect } from 'react';
import { Star, ExternalLink, Loader2, User } from 'lucide-react';
import { useTripAdvisorApi } from '@/hooks/useTripAdvisorApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TripAdvisorReviewsProps {
  placeName: string;
  placeAddress: string;
  maxReviews?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export function TripAdvisorReviews({ 
  placeName, 
  placeAddress, 
  maxReviews = 5, 
  showTitle = true,
  compact = false 
}: TripAdvisorReviewsProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { searchLocations, getLocationReviews } = useTripAdvisorApi();

  useEffect(() => {
    loadReviews();
  }, [placeName, placeAddress]);

  const loadReviews = async () => {
    if (!placeName || !placeAddress) return;

    setIsLoading(true);
    try {
      const searchQuery = `${placeName} ${placeAddress}`;
      const locations = await searchLocations(searchQuery);
      
      if (locations && locations.length > 0) {
        const location = locations[0];
        setLocationId(location.location_id);
        
        const reviewData = await getLocationReviews(location.location_id, maxReviews);
        setReviews(reviewData || []);
      }
    } catch (error) {
      console.error('Error loading TripAdvisor reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading reviews from TripAdvisor...
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <h4 className="font-semibold">Reviews from TripAdvisor</h4>
          </div>
          {locationId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://www.tripadvisor.com/UserReviewEdit-g${locationId}`, '_blank')}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View all
            </Button>
          )}
        </div>
      )}
      
      <div className={`space-y-3 ${compact ? 'max-h-48' : 'max-h-64'} overflow-y-auto`}>
        {reviews.map((review, index) => (
          <div key={review.id || index} className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {renderStars(review.rating)}
                <Badge variant="secondary" className="text-xs">
                  {review.rating}/5
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.published_date).toLocaleDateString()}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-medium">{review.user?.username || 'Anonymous'}</span>
              {review.user?.user_location?.name && (
                <span className="text-xs text-muted-foreground">
                  from {review.user.user_location.name}
                </span>
              )}
            </div>
            
            {review.title && (
              <h5 className="font-medium text-sm mb-1">{review.title}</h5>
            )}
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {compact ? truncateText(review.text, 150) : truncateText(review.text, 300)}
            </p>
            
            {review.helpful_votes > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                👍 {review.helpful_votes} helpful votes
              </div>
            )}
            
            {review.subratings && Object.keys(review.subratings).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(review.subratings).slice(0, 3).map(([key, subrating]: [string, any]) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {subrating.localized_name}: {subrating.value}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {locationId && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`https://www.tripadvisor.com/UserReviewEdit-g${locationId}`, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Read all reviews on TripAdvisor
          </Button>
        </div>
      )}
    </div>
  );
}