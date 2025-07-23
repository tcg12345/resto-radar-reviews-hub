import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Chat {
  id: string;
  friend: {
    id: string;
    username: string;
    name: string | null;
    avatar_url: string | null;
  };
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

interface MobileChatListProps {
  chats: Chat[];
  isLoading: boolean;
}

export function MobileChatList({ chats, isLoading }: MobileChatListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg animate-pulse">
            <div className="w-12 h-12 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          Start a conversation with your friends to see your chats here
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {chats.map((chat) => (
        <Card
          key={chat.id}
          className="p-4 hover:bg-accent/50 transition-colors cursor-pointer border-border/50"
          onClick={() => navigate(`/chat/${chat.friend.id}`)}
        >
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={chat.friend.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                <User className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground truncate">
                  {chat.friend.name || chat.friend.username}
                </h3>
                {chat.unread_count && chat.unread_count > 0 && (
                  <Badge variant="default" className="ml-2 h-5 min-w-5 text-xs px-1.5">
                    {chat.unread_count}
                  </Badge>
                )}
              </div>
              
              {chat.last_message && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {chat.last_message}
                </p>
              )}
              
              {chat.last_message_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(chat.last_message_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}