import { useState } from 'react';
import { Search, UserPlus, Users, Clock, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { EnhancedFriendsPage } from '@/components/EnhancedFriendsPage';

interface SearchResult {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

export function FriendsPage() {
  const { user } = useAuth();
  const { 
    friends, 
    pendingRequests, 
    sentRequests, 
    isLoading, 
    sendFriendRequest, 
    respondToFriendRequest, 
    removeFriend, 
    searchUsers 
  } = useFriends();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeView, setActiveView] = useState<'activity' | 'manage'>('activity');

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const isAlreadyFriend = (userId: string) => {
    return friends.some(friend => friend.id === userId);
  };

  const hasPendingRequest = (userId: string) => {
    return sentRequests.some(request => request.receiver_id === userId) ||
           pendingRequests.some(request => request.sender_id === userId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (activeView === 'activity') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Friends</h1>
          <Button onClick={() => setActiveView('manage')} variant="outline">
            Manage Friends
          </Button>
        </div>
        <EnhancedFriendsPage />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Manage Friends</h1>
        </div>
        <Button onClick={() => setActiveView('activity')} variant="outline">
          View Activity
        </Button>
      </div>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Received ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Friends</CardTitle>
            </CardHeader>
            <CardContent>
              {friends.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No friends yet. Start by searching for people to connect with!
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={friend.avatar_url || ''} />
                          <AvatarFallback>
                            {friend.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">@{friend.username}</div>
                          {friend.name && (
                            <div className="text-sm text-muted-foreground">{friend.name}</div>
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
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFriend(friend.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Find Friends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={result.avatar_url || ''} />
                          <AvatarFallback>
                            {result.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">@{result.username}</div>
                          {result.name && (
                            <div className="text-sm text-muted-foreground">{result.name}</div>
                          )}
                          <Badge variant={result.is_public ? "default" : "secondary"}>
                            {result.is_public ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={isAlreadyFriend(result.id) || hasPendingRequest(result.id)}
                        onClick={() => sendFriendRequest(result.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isAlreadyFriend(result.id) 
                          ? 'Friends' 
                          : hasPendingRequest(result.id) 
                          ? 'Pending' 
                          : 'Add Friend'
                        }
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No users found matching "{searchQuery}"
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests Received</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending friend requests
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.sender?.avatar_url || ''} />
                          <AvatarFallback>
                            {request.sender?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">@{request.sender?.username}</div>
                          {request.sender?.name && (
                            <div className="text-sm text-muted-foreground">{request.sender.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => respondToFriendRequest(request.id, true)}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => respondToFriendRequest(request.id, false)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Friend Requests Sent</CardTitle>
            </CardHeader>
            <CardContent>
              {sentRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No sent friend requests
                </p>
              ) : (
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.receiver?.avatar_url || ''} />
                          <AvatarFallback>
                            {request.receiver?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">@{request.receiver?.username}</div>
                          {request.receiver?.name && (
                            <div className="text-sm text-muted-foreground">{request.receiver.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}