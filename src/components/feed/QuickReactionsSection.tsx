import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Smile, Flame, Star, ThumbsUp, ChefHat } from 'lucide-react';

interface QuickReaction {
  id: string;
  emoji: string;
  label: string;
  count: number;
  icon: React.ComponentType<any>;
  color: string;
}

interface QuickReactionsSectionProps {
  reactions: QuickReaction[];
  onReactionClick: (reactionId: string) => void;
}

export function QuickReactionsSection({ 
  reactions, 
  onReactionClick 
}: QuickReactionsSectionProps) {
  const defaultReactions: QuickReaction[] = [
    { id: 'love', emoji: '😍', label: 'Amazing!', count: 0, icon: Heart, color: 'text-red-500' },
    { id: 'fire', emoji: '🔥', label: 'Fire!', count: 0, icon: Flame, color: 'text-orange-500' },
    { id: 'delicious', emoji: '😋', label: 'Delicious', count: 0, icon: Smile, color: 'text-yellow-500' },
    { id: 'perfect', emoji: '⭐', label: 'Perfect', count: 0, icon: Star, color: 'text-yellow-400' },
    { id: 'recommended', emoji: '👍', label: 'Recommend', count: 0, icon: ThumbsUp, color: 'text-blue-500' },
    { id: 'chef-kiss', emoji: '👨‍🍳', label: "Chef's Kiss", count: 0, icon: ChefHat, color: 'text-purple-500' },
  ];

  const reactionData = reactions.length > 0 ? reactions : defaultReactions;

  return (
    <Card className="bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-900/10 dark:to-purple-900/10 border border-pink-200/50 dark:border-pink-800/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg text-foreground flex items-center gap-2">
          <span className="text-xl">💫</span>
          Quick Reactions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tap to react to today's food discoveries
        </p>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {reactionData.map((reaction) => {
            const IconComponent = reaction.icon;
            return (
              <Button
                key={reaction.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:scale-105 transition-all duration-200 border-border/50 hover:border-border group"
                onClick={() => onReactionClick(reaction.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{reaction.emoji}</span>
                  <IconComponent className={`h-4 w-4 ${reaction.color} group-hover:scale-110 transition-transform`} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm text-foreground">
                    {reaction.label}
                  </div>
                  {reaction.count > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {reaction.count} reactions
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-gradient-to-r from-pink-100/50 to-purple-100/50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg border border-pink-200/30 dark:border-pink-800/30">
          <p className="text-xs text-center text-muted-foreground">
            Your reactions help us understand what you love and improve recommendations
          </p>
        </div>
      </CardContent>
    </Card>
  );
}