import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      });
      if (!error && data) setReviews(data as ReviewRow[]);
      setLoading(false);
    };
    run();
  }, [placeId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background backdrop-blur border-b pt-safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-10 w-10 p-0" aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h1 className="text-lg font-semibold">Friends Ratings</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading friends ratings...</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-sm text-muted-foreground">No friends have rated this place yet.</p>
        )}

        {reviews.map((r) => (
          <Card key={r.review_id}>
            <CardContent className="p-4 flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={r.avatar_url} alt={r.username} />
                <AvatarFallback>{(r.username || 'A').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{r.username || 'Anonymous'}</div>
                  <div className="flex items-center gap-2">
                    <StarRating rating={Number(r.overall_rating) || 0} readonly={true} size="sm" />
                    <span className="text-sm font-semibold">{Number(r.overall_rating).toFixed(1)}</span>
                  </div>
                </div>
                {r.review_text && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line line-clamp-6">{r.review_text}</p>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                  {r.source_type === 'personal_rating' ? ' • Personal rating' : ' • User review'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
