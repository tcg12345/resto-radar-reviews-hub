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

      <div className="px-3 py-4 space-y-4 max-w-screen-sm mx-auto">
        {loading && <p className="text-sm text-muted-foreground">Loading friends ratings...</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No friends have rated this place yet.</p>
        )}

        {reviews.length > 0 && (
          <ul className="divide-y divide-border/60">
            {reviews.map((r) => (
              <li key={r.review_id} className="relative py-4 pl-12 pr-4 animate-fade-in">
                {/* Avatar on the left */}
                <div className="absolute left-0 top-4">
                  <Avatar className="h-8 w-8 ring-1 ring-border">
                    <AvatarImage src={r.avatar_url} alt={r.username} />
                    <AvatarFallback className="text-xs">{(r.username || 'A').slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="min-w-0">
                  {/* Header row: name + rating pill */}
                  <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <div className="font-medium text-sm truncate">{r.username || 'Anonymous'}</div>
                    <div className="inline-flex items-center gap-1 rounded-full border border-primary/10 bg-primary/5 px-2 py-1 shrink-0 mr-1">
                      <StarRating rating={Number(r.overall_rating) || 0} readonly={true} size="sm" />
                      <span className="text-xs font-semibold text-primary">{Number(r.overall_rating).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                    {r.source_type === 'personal_rating' ? ' • Personal rating' : ' • User review'}
                  </div>

                  {/* Optional review photos */}
                  {Array.isArray(r.photos) && r.photos.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {r.photos.slice(0, 3).map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt={`Review photo ${i + 1}`}
                          className="h-16 w-full object-cover rounded-lg hover-scale"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  )}

                  {/* Review text with expand/collapse */}
                  {r.review_text && (
                    <div className="mt-2">
                      <p
                        className={`text-sm leading-relaxed text-foreground break-words whitespace-pre-wrap ${
                          expanded[r.review_id] ? '' : 'line-clamp-4'
                        }`}
                      >
                        {r.review_text}
                      </p>
                      <div className="mt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-0 h-7 text-xs"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [r.review_id]: !prev[r.review_id] }))
                          }
                        >
                          {expanded[r.review_id] ? 'Show less' : 'Show more'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
