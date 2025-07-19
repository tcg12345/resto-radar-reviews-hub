import { useState } from 'react';
import { Sparkles, Wand2, BarChart3, Loader2, Copy, Check, Globe, Clock, TrendingUp, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIReviewAssistantProps {
  restaurantName: string;
  cuisine: string;
  rating?: number;
  priceRange?: number;
  aspects?: {
    food: number;
    service: number;
    ambiance: number;
    value: number;
  };
  currentReview?: string;
  onReviewUpdate: (review: string) => void;
}

export function AIReviewAssistant({
  restaurantName,
  cuisine,
  rating,
  priceRange,
  aspects,
  currentReview,
  onReviewUpdate,
}: AIReviewAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingInfo, setIsGettingInfo] = useState(false);
  const [experience, setExperience] = useState('');
  const [generatedReview, setGeneratedReview] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [currentInfo, setCurrentInfo] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [activeAction, setActiveAction] = useState<'generate' | 'improve' | 'analyze' | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('assistant');

  const getCurrentInfo = async (infoType: string, customQuestion?: string) => {
    setIsGettingInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke('perplexity-restaurant-info', {
        body: {
          restaurantName,
          infoType,
          additionalContext: customQuestion || `This is a ${cuisine} restaurant${rating ? ` with a ${rating} star rating` : ''}.`
        }
      });

      if (error) throw error;

      setCurrentInfo(data.generatedInfo);
      
      if (customQuestion) {
        toast.success(`Got answer: ${customQuestion.slice(0, 50)}...`);
      } else {
        toast.success(`Got current ${infoType.replace('_', ' ')} for ${restaurantName}`);
      }
    } catch (error) {
      console.error('Error getting current info:', error);
      toast.error('Failed to get current restaurant information');
    } finally {
      setIsGettingInfo(false);
    }
  };

  const handleCustomInquiry = async () => {
    if (!customQuery.trim()) {
      toast.error('Please enter a question about the restaurant');
      return;
    }
    
    await getCurrentInfo('custom', customQuery);
    setCustomQuery('');
  };

  const callAIAssistant = async (action: 'generate' | 'improve' | 'analyze') => {
    setIsLoading(true);
    setActiveAction(action);
    setGeneratedReview('');
    setAnalysis('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-review-assistant', {
        body: {
          action,
          restaurantName,
          cuisine,
          rating,
          priceRange,
          experience: action === 'generate' ? experience : undefined,
          existingReview: action === 'improve' || action === 'analyze' ? currentReview : undefined,
          aspects,
          currentInfo: currentInfo || undefined, // Include current info from Perplexity
        }
      });

      if (error) {
        console.error('AI assistant error:', error);
        throw new Error(error.message || 'Failed to get AI assistance');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate review assistance');
      }

      if (action === 'analyze') {
        setAnalysis(data.result);
      } else {
        setGeneratedReview(data.result);
      }

      toast.success(`Review ${action === 'generate' ? 'generated' : action === 'improve' ? 'improved' : 'analyzed'} successfully!`);

    } catch (error) {
      console.error('Error calling AI assistant:', error);
      toast.error(`Failed to ${action} review. Please try again.`);
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleGenerate = () => {
    if (!experience.trim()) {
      toast.error('Please describe your experience first');
      return;
    }
    callAIAssistant('generate');
  };

  const handleImprove = () => {
    if (!currentReview?.trim()) {
      toast.error('Please write a review first to improve it');
      return;
    }
    callAIAssistant('improve');
  };

  const handleAnalyze = () => {
    if (!currentReview?.trim()) {
      toast.error('Please write a review first to analyze it');
      return;
    }
    callAIAssistant('analyze');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const useGeneratedReview = () => {
    onReviewUpdate(generatedReview);
    toast.success('Review added to your notes!');
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Review Assistant
        </CardTitle>
        <CardDescription>
          Get current restaurant info and AI-powered help writing detailed reviews
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Current Info</TabsTrigger>
            <TabsTrigger value="assistant">Review Assistant</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-4">
            <Tabs defaultValue="quick" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="quick">Quick Info</TabsTrigger>
                <TabsTrigger value="custom">Ask Question</TabsTrigger>
              </TabsList>
              
              <TabsContent value="quick" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button
                    onClick={() => getCurrentInfo('current_info')}
                    disabled={isGettingInfo}
                    variant="outline"
                    size="sm"
                  >
                    <Globe className="h-4 w-4 mr-1" />
                    General
                  </Button>
                  <Button
                    onClick={() => getCurrentInfo('hours')}
                    disabled={isGettingInfo}
                    variant="outline"
                    size="sm"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Hours
                  </Button>
                  <Button
                    onClick={() => getCurrentInfo('reviews')}
                    disabled={isGettingInfo}
                    variant="outline"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Reviews
                  </Button>
                  <Button
                    onClick={() => getCurrentInfo('trending')}
                    disabled={isGettingInfo}
                    variant="outline"
                    size="sm"
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Trending
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
                      disabled={isGettingInfo || !customQuery.trim()}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Examples: "What's their signature dish?", "Is it good for dates?", "Do they take reservations?"
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {isGettingInfo && (
              <div className="p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Getting current information...</p>
              </div>
            )}

            {currentInfo && !isGettingInfo && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Current Restaurant Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-normal text-foreground">
                    {currentInfo}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assistant" className="space-y-4">
        {/* Experience Input for Generation */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Describe your experience (optional):</label>
          <Textarea
            placeholder="Tell me about your visit - what did you order, how was the service, what stood out about the atmosphere, etc."
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="min-h-20"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            variant="default"
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoading && activeAction === 'generate' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Review
          </Button>

          <Button
            onClick={handleImprove}
            disabled={isLoading || !currentReview?.trim()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoading && activeAction === 'improve' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Improve Review
          </Button>

          <Button
            onClick={handleAnalyze}
            disabled={isLoading || !currentReview?.trim()}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {isLoading && activeAction === 'analyze' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Analyze Review
          </Button>
        </div>

        {/* Generated Review Display */}
        {generatedReview && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Generated Review</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(generatedReview)}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    onClick={useGeneratedReview}
                    variant="default"
                    size="sm"
                    className="h-8"
                  >
                    Use This Review
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {generatedReview}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Analysis Display */}
        {analysis && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Review Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {analysis}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Tips */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-sm mb-2">💡 Review Writing Tips:</h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Be specific about dishes you ordered and how they tasted</li>
              <li>• Mention service quality and staff friendliness</li>
              <li>• Describe the atmosphere and setting</li>
              <li>• Comment on value for money</li>
              <li>• Include any special occasions or dietary accommodations</li>
              <li>• Mention if you'd return or recommend to others</li>
            </ul>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}