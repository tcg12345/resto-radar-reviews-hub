import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, CheckCircle, RefreshCw, Globe, Star, Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PerplexityRestaurantInfoProps {
  restaurantName: string;
  address?: string;
  city?: string;
  cuisine?: string;
}

export function PerplexityRestaurantInfo({
  restaurantName,
  address,
  city,
  cuisine,
}: PerplexityRestaurantInfoProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<string>('');
  const [activeTab, setActiveTab] = useState('general');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [customQuery, setCustomQuery] = useState<string>('');
  const { toast } = useToast();

  const getRestaurantInfo = async (infoType: string, customQuestion?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('perplexity-restaurant-info', {
        body: {
          restaurantName,
          address,
          city,
          infoType,
          additionalContext: customQuestion || (cuisine ? `This is a ${cuisine} restaurant.` : '')
        }
      });

      if (error) throw error;

      setCurrentInfo(data.generatedInfo);
      setLastUpdated(data.lastUpdated);
      setActiveTab(infoType);
      
      if (customQuestion) {
        toast({
          title: "Custom inquiry completed!",
          description: `Got information about: ${customQuestion.slice(0, 50)}...`,
        });
      } else {
        toast({
          title: "Information updated!",
          description: `Got current ${infoType.replace('_', ' ')} for ${restaurantName}`,
        });
      }
    } catch (error) {
      console.error('Error getting restaurant info:', error);
      toast({
        title: "Error",
        description: "Failed to get current restaurant information",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomInquiry = async () => {
    if (!customQuery.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question about the restaurant",
        variant: "destructive",
      });
      return;
    }
    
    await getRestaurantInfo('custom', customQuery);
    setCustomQuery('');
  };

  const formatInfoType = (type: string) => {
    switch (type) {
      case 'current_info': return 'General Info';
      case 'hours': return 'Hours';
      case 'reviews': return 'Recent Reviews';
      case 'trending': return 'Trending';
      case 'verification': return 'Verification';
      default: return type;
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Current Restaurant Information
        </CardTitle>
        <CardDescription>
          Get up-to-date information about {restaurantName} using real-time web search
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Quick Info</TabsTrigger>
            <TabsTrigger value="custom">Custom Inquiry</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quick" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Button
                onClick={() => getRestaurantInfo('current_info')}
                disabled={isLoading}
                variant={activeTab === 'current_info' ? 'default' : 'outline'}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                General
              </Button>
              <Button
                onClick={() => getRestaurantInfo('hours')}
                disabled={isLoading}
                variant={activeTab === 'hours' ? 'default' : 'outline'}
                size="sm"
              >
                <Clock className="h-4 w-4 mr-1" />
                Hours
              </Button>
              <Button
                onClick={() => getRestaurantInfo('reviews')}
                disabled={isLoading}
                variant={activeTab === 'reviews' ? 'default' : 'outline'}
                size="sm"
              >
                <Star className="h-4 w-4 mr-1" />
                Reviews
              </Button>
              <Button
                onClick={() => getRestaurantInfo('trending')}
                disabled={isLoading}
                variant={activeTab === 'trending' ? 'default' : 'outline'}
                size="sm"
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Trending
              </Button>
              <Button
                onClick={() => getRestaurantInfo('verification')}
                disabled={isLoading}
                variant={activeTab === 'verification' ? 'default' : 'outline'}
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Verify
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask anything about this restaurant..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomInquiry()}
                  className="flex-1"
                />
                <Button
                  onClick={handleCustomInquiry}
                  disabled={isLoading || !customQuery.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Examples: "What's their most popular dish?", "Do they have outdoor seating?", "Is it good for groups?"
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {isLoading && (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Getting current information...</p>
          </div>
        )}

        {currentInfo && !isLoading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {formatInfoType(activeTab)}
              </Badge>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated: {new Date(lastUpdated).toLocaleString()}
                </span>
              )}
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="text-sm whitespace-pre-wrap leading-relaxed font-mono">
                {currentInfo}
              </div>
            </div>
          </div>
        )}

        {!currentInfo && !isLoading && (
          <div className="p-4 text-center text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Get current information or ask a custom question about this restaurant</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}