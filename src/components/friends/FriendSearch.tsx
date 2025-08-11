import { useState, useEffect } from 'react';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

interface FriendSearchProps {
  onSearchUsers: (query: string) => Promise<SearchResult[]>;
  onSendFriendRequest: (userId: string) => Promise<void>;
  isAlreadyFriend: (userId: string) => boolean;
  hasPendingRequest: (userId: string) => boolean;
}

export function FriendSearch({ 
  onSearchUsers, 
  onSendFriendRequest, 
  isAlreadyFriend, 
  hasPendingRequest 
}: FriendSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
  };

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await onSearchUsers(q);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearchUsers]);

  const getButtonText = (userId: string) => {
    if (isAlreadyFriend(userId)) return 'Already Friends';
    if (hasPendingRequest(userId)) return 'Request Pending';
    return 'Send Request';
  };

  const getButtonVariant = (userId: string) => {
    if (isAlreadyFriend(userId)) return 'secondary';
    if (hasPendingRequest(userId)) return 'outline';
    return 'default';
  };

  return (
    <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Search className="h-5 w-5 text-primary" />
          Find Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Searching...</span>
          </div>
        )}

        {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {searchResults.map((result) => (
              <div 
                key={result.id} 
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={result.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {result.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">@{result.username}</p>
                    {result.name && (
                      <p className="text-sm text-muted-foreground">{result.name}</p>
                    )}
                    <Badge 
                      variant={result.is_public ? "default" : "secondary"} 
                      className="mt-1 text-xs"
                    >
                      {result.is_public ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={getButtonVariant(result.id)}
                  disabled={isAlreadyFriend(result.id) || hasPendingRequest(result.id)}
                  onClick={() => onSendFriendRequest(result.id)}
                  className={cn(
                    "min-w-[120px]",
                    !isAlreadyFriend(result.id) && !hasPendingRequest(result.id) && "hover:scale-105 transition-transform"
                  )}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {getButtonText(result.id)}
                </Button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Type at least 2 characters to search for users
          </p>
        )}
      </CardContent>
    </Card>
  );
}