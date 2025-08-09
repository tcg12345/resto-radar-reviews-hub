import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Calendar, Users, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Itinerary {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_shareable: boolean;
  locations: any;
  hotels: any;
  flights: any;
  events: any;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_multi_city: boolean;
  was_created_with_length_of_stay: boolean;
}

export function ItineraryPrivacySettings() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchItineraries();
    }
  }, [user]);

  const fetchItineraries = async () => {
    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItineraries(data || []);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
      toast.error('Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  const toggleItineraryPrivacy = async (itineraryId: string, currentShareable: boolean) => {
    setUpdating(prev => new Set([...prev, itineraryId]));
    
    try {
      const { error } = await supabase
        .from('itineraries')
        .update({ is_shareable: !currentShareable })
        .eq('id', itineraryId);

      if (error) throw error;

      setItineraries(prev => 
        prev.map(itinerary => 
          itinerary.id === itineraryId 
            ? { ...itinerary, is_shareable: !currentShareable }
            : itinerary
        )
      );

      toast.success(
        !currentShareable 
          ? 'Itinerary is now shared with friends' 
          : 'Itinerary is now private'
      );
    } catch (error) {
      console.error('Error updating itinerary privacy:', error);
      toast.error('Failed to update privacy setting');
    } finally {
      setUpdating(prev => {
        const newSet = new Set(prev);
        newSet.delete(itineraryId);
        return newSet;
      });
    }
  };

  const makeAllPublic = async () => {
    const privateItineraries = itineraries.filter(it => !it.is_shareable);
    if (privateItineraries.length === 0) {
      toast.info('All itineraries are already shared with friends');
      return;
    }

    try {
      const { error } = await supabase
        .from('itineraries')
        .update({ is_shareable: true })
        .eq('user_id', user?.id)
        .eq('is_shareable', false);

      if (error) throw error;

      setItineraries(prev => 
        prev.map(itinerary => ({ ...itinerary, is_shareable: true }))
      );

      toast.success(`Shared ${privateItineraries.length} itinerary(ies) with friends`);
    } catch (error) {
      console.error('Error making all itineraries public:', error);
      toast.error('Failed to update privacy settings');
    }
  };

  const makeAllPrivate = async () => {
    const publicItineraries = itineraries.filter(it => it.is_shareable);
    if (publicItineraries.length === 0) {
      toast.info('All itineraries are already private');
      return;
    }

    try {
      const { error } = await supabase
        .from('itineraries')
        .update({ is_shareable: false })
        .eq('user_id', user?.id)
        .eq('is_shareable', true);

      if (error) throw error;

      setItineraries(prev => 
        prev.map(itinerary => ({ ...itinerary, is_shareable: false }))
      );

      toast.success(`Made ${publicItineraries.length} itinerary(ies) private`);
    } catch (error) {
      console.error('Error making all itineraries private:', error);
      toast.error('Failed to update privacy settings');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Itinerary Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (itineraries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Itinerary Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No itineraries found</p>
            <p className="text-sm">Create some travel plans to manage their privacy settings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const publicCount = itineraries.filter(it => it.is_shareable).length;
  const privateCount = itineraries.length - publicCount;

  if (isMobile) {
    return (
      <div className="space-y-0">
        {/* Header */}
        <div className="px-4 py-4 bg-background border-t border-border">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Itinerary Privacy
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Control which trips your friends can see
          </p>
        </div>

        {/* Summary Stats */}
        <div className="px-4 py-4 bg-background border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">{publicCount}</div>
                <div className="text-xs text-muted-foreground">Shared</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">{privateCount}</div>
                <div className="text-xs text-muted-foreground">Private</div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={makeAllPublic} className="flex-1">
              <Unlock className="w-4 h-4 mr-2" />
              Share All
            </Button>
            <Button variant="outline" size="sm" onClick={makeAllPrivate} className="flex-1">
              <Lock className="w-4 h-4 mr-2" />
              Make All Private
            </Button>
          </div>
        </div>

        {/* Individual Itineraries */}
        <div className="divide-y divide-border">
          {itineraries.map((itinerary) => (
            <div key={itinerary.id} className="px-4 py-4 bg-background">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-foreground truncate">{itinerary.title}</h4>
                    <Badge 
                      variant={itinerary.is_shareable ? "default" : "secondary"}
                      className="text-xs shrink-0"
                    >
                      {itinerary.is_shareable ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Shared
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Private
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(itinerary.start_date), 'MMM d')} - {format(new Date(itinerary.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{Array.isArray(itinerary.locations) ? itinerary.locations.length : 0} location(s)</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 ml-4">
                  <Switch
                    checked={itinerary.is_shareable}
                    onCheckedChange={() => toggleItineraryPrivacy(itinerary.id, itinerary.is_shareable)}
                    disabled={updating.has(itinerary.id)}
                  />
                  <div className="text-xs text-muted-foreground">
                    {updating.has(itinerary.id) ? 'Updating...' : (itinerary.is_shareable ? 'Shared' : 'Private')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Itinerary Privacy Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Control which itineraries your friends can see
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{publicCount}</div>
              <div className="text-xs text-muted-foreground">Shared</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{privateCount}</div>
              <div className="text-xs text-muted-foreground">Private</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={makeAllPublic}>
              <Unlock className="w-4 h-4 mr-1" />
              Share All
            </Button>
            <Button variant="outline" size="sm" onClick={makeAllPrivate}>
              <Lock className="w-4 h-4 mr-1" />
              Make All Private
            </Button>
          </div>
        </div>

        <Separator />

        {/* Individual Itineraries */}
        <div className="space-y-4">
          <h3 className="font-medium">Individual Settings</h3>
          {itineraries.map((itinerary) => (
            <div
              key={itinerary.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium">{itinerary.title}</h4>
                  <Badge 
                    variant={itinerary.is_shareable ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {itinerary.is_shareable ? (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Shared with friends
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Private
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(itinerary.start_date), 'MMM d')} - {format(new Date(itinerary.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{Array.isArray(itinerary.locations) ? itinerary.locations.length : 0} location(s)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={itinerary.is_shareable}
                  onCheckedChange={() => toggleItineraryPrivacy(itinerary.id, itinerary.is_shareable)}
                  disabled={updating.has(itinerary.id)}
                />
                <div className="text-xs text-muted-foreground min-w-[60px]">
                  {updating.has(itinerary.id) ? 'Updating...' : (itinerary.is_shareable ? 'Shared' : 'Private')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}