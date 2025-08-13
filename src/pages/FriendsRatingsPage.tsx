import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Users } from 'lucide-react';
import { StarRating } from '@/components/StarRating';

interface ReviewRow {
  review_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  overall_rating: number;
  category_ratings?: any;
  review_text?: string;
  photos?: string[];
  photo_captions?: string[];
  photo_dish_names?: string[];
  created_at: string;
  source_type: string;
}

export default function FriendsRatingsPage() {
  const { placeId } = useParams();
  const [search] = useSearchParams();
  const name = search.get('name') || 'Restaurant';
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = `${name} • Friends Ratings`;
  }, [name]);

  useEffect(() => {
    const run = async () => {
      if (!placeId) return;
      setLoading(true);
      const { data, error } = await supabase.rpc('get_friend_reviews_for_place', {
        place_id_param: placeId,
        page_limit: 100,
        page_offset: 0,
        restaurant_name_param: name,
      } as any);
      if (!error && data) setReviews(data as ReviewRow[]);
      setLoading(false);
    };
    run();
  }, [placeId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background backdrop-blur border-b pt-safe-area-top">
        <div className="flex items-center gap-3 p-4" role="banner">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-10 w-10 p-0" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h1 className="text-lg font-semibold">Friends Ratings</h1>
          </div>
        </div>
      </div>

      <div className="pb-safe-area-bottom">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-48 bg-muted rounded mx-auto"></div>
              <div className="h-4 w-32 bg-muted rounded mx-auto"></div>
            </div>
          </div>
        )}
        
        {!loading && reviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No ratings yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              None of your friends have rated this restaurant yet. Be the first to share your experience!
            </p>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-0">
            {reviews.map((r, index) => (
              <div key={r.review_id} className="group border-b border-border/30 last:border-b-0 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="px-4 py-6 hover:bg-muted/30 transition-colors duration-200">
                  {/* Header with avatar and user info */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-12 w-12 ring-2 ring-background shadow-lg">
                      <AvatarImage src={r.avatar_url} alt={r.username} />
                      <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                        {(r.username || 'A').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-base text-foreground truncate">
                          {r.username || 'Anonymous'}
                        </h3>
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full px-3 py-1.5 border border-primary/20">
                          <StarRating rating={Number(r.overall_rating) || 0} readonly={true} size="sm" />
                          <span className="text-sm font-bold text-primary">{Number(r.overall_rating).toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          {r.source_type === 'personal_rating' ? '⭐ Personal rating' : '📝 Full review'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review photos */}
                  {Array.isArray(r.photos) && r.photos.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-3 gap-3">
                        {r.photos.slice(0, 3).map((src, i) => (
                          <div
                            key={i}
                            className="relative aspect-square rounded-xl overflow-hidden bg-muted group-hover:scale-[1.02] transition-transform duration-300"
                          >
                            <img
                              src={src}
                              alt={r.photo_dish_names?.[i] || `Photo ${i + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                            {r.photo_dish_names?.[i] && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                <p className="text-white text-xs font-medium truncate">
                                  {r.photo_dish_names[i]}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {r.photos.length > 3 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          +{r.photos.length - 3} more photos
                        </p>
                      )}
                    </div>
                  )}

                  {/* Review text */}
                  {r.review_text && (
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                      <p
                        className={`text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap ${
                          expanded[r.review_id] ? '' : 'line-clamp-4'
                        }`}
                      >
                        {r.review_text}
                      </p>
                      {r.review_text.length > 200 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3 h-8 px-3 text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [r.review_id]: !prev[r.review_id] }))
                          }
                        >
                          {expanded[r.review_id] ? '↑ Show less' : '↓ Read more'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
