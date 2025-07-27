import { Check, X, Clock, Send, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface FriendRequest {
  id: string;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string;
  };
  receiver?: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string;
  };
}

interface FriendRequestsProps {
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  onRespondToRequest: (requestId: string, accept: boolean) => Promise<void>;
}

export function FriendRequests({ pendingRequests, sentRequests, onRespondToRequest }: FriendRequestsProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="h-5 w-5 text-primary" />
          Friend Requests
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="received" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Received 
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 px-2 py-0 text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Sent
              {sentRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-2 py-0 text-xs">
                  {sentRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No pending requests</p>
                <p className="text-sm text-muted-foreground">
                  Friend requests will appear here when someone wants to connect with you
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                        <AvatarImage src={request.sender?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {request.sender?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-lg">@{request.sender?.username}</p>
                        {request.sender?.name && (
                          <p className="text-sm text-muted-foreground">{request.sender.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onRespondToRequest(request.id, true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRespondToRequest(request.id, false)}
                        className="hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <Send className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No sent requests</p>
                <p className="text-sm text-muted-foreground">
                  Friend requests you send will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.receiver?.avatar_url || ''} />
                        <AvatarFallback className="bg-secondary/20 text-secondary font-semibold">
                          {request.receiver?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-lg">@{request.receiver?.username}</p>
                        {request.receiver?.name && (
                          <p className="text-sm text-muted-foreground">{request.receiver.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Sent {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>

                    <Badge variant="secondary" className="px-4 py-2">
                      <Clock className="h-3 w-3 mr-2" />
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}