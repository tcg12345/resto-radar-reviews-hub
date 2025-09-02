import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ExpertBadge } from '@/components/ExpertBadge';
import { ProfilePreview } from '@/types/feed';

interface ProfileCarouselProps {
  profiles: ProfilePreview[];
  title: string;
  onProfileClick?: (profileId: string) => void;
}

export function ProfileCarousel({ profiles, title, onProfileClick }: ProfileCarouselProps) {
  const navigate = useNavigate();

  if (profiles.length === 0) return null;

  const handleProfileClick = (profileId: string) => {
    if (onProfileClick) {
      onProfileClick(profileId);
    } else {
      navigate(`/friend-profile/${profileId}`);
    }
  };

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
        {title}
      </h2>
      
      <div className="flex gap-4 overflow-x-auto pb-2">
        {profiles.map((profile) => (
          <Button
            key={profile.id}
            variant="ghost"
            className="flex-col h-auto p-2 min-w-0 flex-shrink-0"
            onClick={() => handleProfileClick(profile.id)}
          >
            <div className="relative">
              <Avatar className="h-14 w-14 ring-2 ring-primary/10 hover:ring-primary/30 transition-all">
                <AvatarImage src={profile.avatar_url || ''} alt={profile.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {(profile.name || profile.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Activity indicator */}
              {profile.recentActivityCount > 0 && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {profile.recentActivityCount > 9 ? '9+' : profile.recentActivityCount}
                  </span>
                </div>
              )}
            </div>
            
            <div className="text-center mt-2 max-w-[70px]">
              <p className="text-xs font-medium truncate">
                {profile.name?.split(' ')[0] || profile.username}
              </p>
              {profile.isExpert && (
                <div className="mt-1 flex justify-center">
                  <ExpertBadge size="sm" showText={false} />
                </div>
              )}
            </div>
          </Button>
        ))}
        
        {/* View all button */}
        <Button
          variant="ghost"
          className="flex-col h-auto p-2 min-w-0 flex-shrink-0"
          onClick={() => navigate('/friends')}
        >
          <div className="h-14 w-14 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-medium">View All</span>
          </div>
        </Button>
      </div>
    </div>
  );
}