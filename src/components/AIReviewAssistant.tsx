import { useState } from 'react';
import { Sparkles, Wand2, BarChart3, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [experience, setExperience] = useState('');
  const [generatedReview, setGeneratedReview] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [activeAction, setActiveAction] = useState<'generate' | 'improve' | 'analyze' | null>(null);
  const [copied, setCopied] = useState(false);

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
          Get help writing detailed, helpful restaurant reviews
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}