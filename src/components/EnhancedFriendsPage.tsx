import { useState, useEffect } from 'react';
import { Star, MapPin, Calendar, Eye, Users, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { useFriends } from '@/hooks/useFriends';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { ContactPermission } from '@/components/ContactPermission';

interface FriendProfileModalProps {
  friend: any;
  isOpen: boolean;
  onClose: () => void;
}

function FriendProfileModal({ friend, isOpen, onClose }: FriendProfileModalProps) {
  const { fetchFriendRestaurants } = useFriendRestaurants();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && friend) {
      loadFriendData();
    }
  }, [isOpen, friend]);

  const loadFriendData = async () => {
    if (!friend) return;
    
    setIsLoading(true);
    try {
      const [restaurantData, wishlistData] = await Promise.all([
        fetchFriendRestaurants(friend.id, false),
        fetchFriendRestaurants(friend.id, true)
      ]);
      
      setRestaurants(restaurantData.filter(r => !r.is_wishlist));
      setWishlist(wishlistData.filter(r => r.is_wishlist));
    } catch (error) {
      console.error('Error loading friend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!friend) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={friend.avatar_url || ''} />
              <AvatarFallback>
                {friend.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-bold">@{friend.username}</div>
              {friend.name && (
                <div className="text-sm text-muted-foreground font-normal">{friend.name}</div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={friend.is_public ? "default" : "secondary"}>
                  {friend.is_public ? 'Public' : 'Private'}
                </Badge>
                <Badge variant="outline">
                  Score: {friend.score}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="restaurants" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="restaurants">
                Rated Restaurants ({restaurants.length})
              </TabsTrigger>
              <TabsTrigger value="wishlist">
                Wishlist ({wishlist.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="restaurants" className="space-y-4">
              {restaurants.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No rated restaurants yet
                </p>
              ) : (
                <div className="grid gap-4">
                  {restaurants.map((restaurant) => (
                    <Card key={restaurant.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                            <p className="text-muted-foreground text-sm">{restaurant.cuisine}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{restaurant.address}, {restaurant.city}</span>
                            </div>
                            {restaurant.date_visited && (
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm">
                                  Visited: {new Date(restaurant.date_visited).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right space-y-2">
                            {restaurant.rating && (
                              <div className="flex items-center gap-2">
                                <StarRating rating={restaurant.rating} readonly size="sm" />
                                <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              {restaurant.priceRange && <PriceRange priceRange={restaurant.priceRange} />}
                              {restaurant.michelinStars && <MichelinStars stars={restaurant.michelinStars} />}
                            </div>
                          </div>
                        </div>
                        {restaurant.notes && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm">{restaurant.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="wishlist" className="space-y-4">
              {wishlist.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No wishlist items yet
                </p>
              ) : (
                <div className="grid gap-4">
                  {wishlist.map((restaurant) => (
                    <Card key={restaurant.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                            <p className="text-muted-foreground text-sm">{restaurant.cuisine}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">{restaurant.address}, {restaurant.city}</span>
                            </div>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="flex items-center gap-2">
                              {restaurant.priceRange && <PriceRange priceRange={restaurant.priceRange} />}
                              {restaurant.michelinStars && <MichelinStars stars={restaurant.michelinStars} />}
                            </div>
                          </div>
                        </div>
                        {restaurant.notes && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm">{restaurant.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EnhancedFriendsPage() {
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showContactPermission, setShowContactPermission] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const { friends, isLoading } = useFriends();
  const { friendRestaurants, fetchAllFriendsRestaurants } = useFriendRestaurants();

  useEffect(() => {
    fetchAllFriendsRestaurants();
  }, []);

  const handleContactPermission = (contactList: any[]) => {
    setContacts(contactList);
    setShowContactPermission(false);
    // Here you could implement contact matching logic
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Friends Activity</h1>
        </div>
        <Button 
          onClick={() => setShowContactPermission(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Phone className="h-4 w-4" />
          Find from Contacts
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Friends List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Your Friends ({friends.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {friends.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No friends yet. Search for people to connect with!
                </p>
              ) : (
                friends.map((friend) => (
                  <div 
                    key={friend.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedFriend(friend)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={friend.avatar_url || ''} />
                        <AvatarFallback>
                          {friend.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">@{friend.username}</div>
                        <div className="text-xs text-muted-foreground">
                          Score: {friend.score}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={friend.is_public ? "default" : "secondary"} className="text-xs">
                        {friend.is_public ? 'Public' : 'Private'}
                      </Badge>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Friend Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Friend Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {friendRestaurants.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No recent activity from friends
                </p>
              ) : (
                <div className="space-y-4">
                  {friendRestaurants.slice(0, 10).map((restaurant) => (
                    <div key={`${restaurant.id}-${restaurant.userId}`} className="flex items-start gap-4 p-4 border rounded-lg">
                      <Avatar>
                        <AvatarFallback>
                          {restaurant.friend_username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">@{restaurant.friend_username}</span>
                          <span className="text-muted-foreground text-sm">rated</span>
                          <StarRating rating={restaurant.rating || 0} readonly size="sm" />
                          <span className="font-semibold">{restaurant.rating?.toFixed(1)}</span>
                        </div>
                        <h4 className="font-semibold">{restaurant.name}</h4>
                        <p className="text-sm text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {restaurant.priceRange && <PriceRange priceRange={restaurant.priceRange} />}
                          {restaurant.michelinStars && <MichelinStars stars={restaurant.michelinStars} />}
                          <span className="text-xs text-muted-foreground">
                            {new Date(restaurant.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Permission Dialog */}
      <Dialog open={showContactPermission} onOpenChange={setShowContactPermission}>
        <DialogContent>
          <ContactPermission
            onPermissionGranted={handleContactPermission}
            onPermissionDenied={() => setShowContactPermission(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Friend Profile Modal */}
      <FriendProfileModal
        friend={selectedFriend}
        isOpen={!!selectedFriend}
        onClose={() => setSelectedFriend(null)}
      />
    </div>
  );
}