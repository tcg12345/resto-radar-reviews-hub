import { useEffect, useMemo, useState } from 'react';
import { Search, Users, Award, Sparkles, Heart, MessageSquare, Share2, Calendar, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { useFriends } from '@/hooks/useFriends';
import { ActivityFeedSkeleton } from '@/components/skeletons/ActivityFeedSkeleton';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';

interface QuickFilters {
  cuisine: string;
  city: string;
  price: string;
  date: string;
  openNow: boolean;
}

const CUISINES = [
  'Any', 'Italian', 'Japanese', 'French', 'Chinese', 'Mexican', 'Indian', 'Thai', 'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Spanish'
];

export default function MobileFeedPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'friends' | 'experts' | 'for-you'>('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<QuickFilters>({ cuisine: 'Any', city: '', price: 'Any', date: 'Any time', openNow: false });
  const [page, setPage] = useState(0);

  // Friends activity
  const { friendRestaurants, isLoading, fetchAllFriendsRestaurants } = useFriendRestaurants();
  useEffect(() => {
    // initial load for friends activity used by All + Friends
    fetchAllFriendsRestaurants(0, 10);
    setPage(0);
  }, []);

  const loadMore = async () => {
    const next = page + 1;
    await fetchAllFriendsRestaurants(next, 10);
    setPage(next);
  };

  // Suggestions (reuse existing friends for now)
  const { friends, isLoading: isLoadingFriends } = useFriends();
  const suggestions = useMemo(() => friends.slice(0, 10), [friends]);

  // Simple filter for friend activities (client-side for now)
  const filteredActivities = useMemo(() => {
    return friendRestaurants.filter((a) => {
      const matchesQuery = !query || a.name?.toLowerCase().includes(query.toLowerCase()) || a.cuisine?.toLowerCase().includes(query.toLowerCase());
      const matchesCuisine = filters.cuisine === 'Any' || a.cuisine === filters.cuisine;
      const matchesCity = !filters.city || a.city?.toLowerCase().includes(filters.city.toLowerCase());
      // price and openNow/date would require more data; skip for now
      return matchesQuery && matchesCuisine && matchesCity;
    });
  }, [friendRestaurants, query, filters]);

  useEffect(() => {
    // Mobile SEO basics
    document.title = 'Feed | Grubby';
  }, []);

  const TopBar = (
    <div className="px-4 py-3 border-b space-y-3 bg-background">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search posts, restaurants, or users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-10"
          aria-label="Search feed"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Select value={filters.cuisine} onValueChange={(v) => setFilters((f) => ({ ...f, cuisine: v }))}>
          <SelectTrigger className="h-9 min-w-[110px]"><SelectValue placeholder="Cuisine" /></SelectTrigger>
          <SelectContent>
            {CUISINES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
        <Input
          placeholder="City"
          value={filters.city}
          onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
          className="h-9 w-[120px]"
        />
        <Select value={filters.price} onValueChange={(v) => setFilters((f) => ({ ...f, price: v }))}>
          <SelectTrigger className="h-9 min-w-[110px]"><SelectValue placeholder="Price" /></SelectTrigger>
          <SelectContent>
            {['Any', '$', '$$', '$$$', '$$$$'].map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filters.date} onValueChange={(v) => setFilters((f) => ({ ...f, date: v }))}>
          <SelectTrigger className="h-9 min-w-[130px]"><SelectValue placeholder="Date" /></SelectTrigger>
          <SelectContent>
            {['Any time', 'Today', 'This week', 'This month'].map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border">
          <Switch id="open-now" checked={filters.openNow} onCheckedChange={(v) => setFilters((f) => ({ ...f, openNow: v }))} />
          <label htmlFor="open-now" className="text-sm">Open Now</label>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="experts">Experts</TabsTrigger>
          <TabsTrigger value="for-you">For You</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top controls */}
      {TopBar}

      {/* Friend Suggestions */}
      <section className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Suggestions for You</h2>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">See all</Button>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {isLoadingFriends && (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="min-w-[140px]">
                  <CardContent className="p-3">
                    <div className="h-24 w-full rounded-lg bg-muted animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </>
          )}
          {!isLoadingFriends && suggestions.map((f) => (
            <Card key={f.id} className="min-w-[160px]">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-12 w-12 mb-2">
                    <AvatarImage src={f.avatar_url || ''} />
                    <AvatarFallback>{(f.name || f.username || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium truncate max-w-[120px]">{f.name || f.username}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]">@{f.username}</div>
                  <Button variant="outline" size="sm" className="h-8 mt-2 w-full">Follow</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Main Feed */}
      <ScrollArea className="h-[calc(100vh-260px)] pb-20">
        <div className="px-4 space-y-4">
          {(tab === 'all' || tab === 'friends') && (
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4" /> Friend Activity</h3>
              {isLoading ? (
                <ActivityFeedSkeleton />
              ) : filteredActivities.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground">No recent activity</CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {filteredActivities.map((a) => (
                    <Card key={a.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9"><AvatarImage src={''} /><AvatarFallback>{(a.friend_username || 'U').charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{a.friend_username || 'Friend'}</div>
                            <div className="text-xs text-muted-foreground">visited</div>
                          </div>
                          <span className="ml-auto text-xs text-muted-foreground">recently</span>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center">
                            <Star className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{a.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{a.city}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {a.cuisine && <Badge variant="secondary" className="text-[10px]">{a.cuisine}</Badge>}
                              {a.priceRange && <Badge variant="secondary" className="text-[10px]">{'$'.repeat(a.priceRange as any)}</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button variant="ghost" size="sm" className="h-8"><Heart className="h-4 w-4 mr-1" /> Like</Button>
                          <Button variant="ghost" size="sm" className="h-8"><MessageSquare className="h-4 w-4 mr-1" /> Comment</Button>
                          <Button variant="ghost" size="sm" className="h-8"><Share2 className="h-4 w-4 mr-1" /> Share</Button>
                          <Button variant="outline" size="sm" className="h-8 ml-auto" onClick={() => navigate(`/restaurant/${a.id}`)}>View</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <div className="flex justify-center">
                    <Button variant="outline" size="sm" onClick={loadMore}>Load more</Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {(tab === 'all' || tab === 'experts') && (
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Award className="h-4 w-4" /> Expert Highlights</h3>
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Expert reviews and articles will appear here.
                </CardContent>
              </Card>
            </section>
          )}

          {(tab === 'all' || tab === 'for-you') && (
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> For You</h3>
              <PersonalizedRecommendations />
            </section>
          )}

          {tab === 'all' && (
            <section>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> Themed Picks</h3>
              <div className="grid grid-cols-2 gap-3">
                {[ 'Best New Openings', 'Hidden Gems', 'Summer Patio Spots', 'Trending Dishes' ].map((title) => (
                  <Card key={title} className="hover-scale">
                    <CardContent className="p-4">
                      <div className="h-20 rounded-md bg-muted mb-2" />
                      <div className="text-sm font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground">Discover curated lists</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
