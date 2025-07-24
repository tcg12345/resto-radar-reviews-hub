import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Edit, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Itinerary } from '@/components/ItineraryBuilder';

interface SavedItinerariesListProps {
  onLoadItinerary: (itinerary: Itinerary) => void;
}

export function SavedItinerariesList({ onLoadItinerary }: SavedItinerariesListProps) {
  const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);

  useEffect(() => {
    loadSavedItineraries();
  }, []);

  const loadSavedItineraries = () => {
    try {
      const saved = localStorage.getItem('savedItineraries');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert date strings back to Date objects
        const itineraries = parsed.map((itinerary: any) => ({
          ...itinerary,
          startDate: new Date(itinerary.startDate),
          endDate: new Date(itinerary.endDate),
          locations: itinerary.locations.map((loc: any) => ({
            ...loc,
            startDate: loc.startDate ? new Date(loc.startDate) : undefined,
            endDate: loc.endDate ? new Date(loc.endDate) : undefined,
          })),
        }));
        setSavedItineraries(itineraries);
      }
    } catch (error) {
      console.error('Error loading saved itineraries:', error);
      toast.error('Failed to load saved itineraries');
    }
  };

  const deleteItinerary = (itineraryId: string) => {
    try {
      const updated = savedItineraries.filter(it => it.id !== itineraryId);
      setSavedItineraries(updated);
      localStorage.setItem('savedItineraries', JSON.stringify(updated));
      toast.success('Itinerary deleted successfully');
    } catch (error) {
      console.error('Error deleting itinerary:', error);
      toast.error('Failed to delete itinerary');
    }
  };

  const exportItinerary = (itinerary: Itinerary) => {
    // Create a text export of the itinerary
    const exportText = `
${itinerary.title}
${format(itinerary.startDate, 'MMMM do, yyyy')} - ${format(itinerary.endDate, 'MMMM do, yyyy')}

Locations: ${itinerary.locations.map(loc => loc.name).join(' → ')}

Events:
${itinerary.events.map(event => `
${event.date} ${event.time} - ${event.title}
${event.description || ''}
${event.type === 'restaurant' && event.restaurantData ? `📍 ${event.restaurantData.address}` : ''}
`).join('\n')}
    `.trim();

    // Create and download file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${itinerary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Itinerary exported successfully');
  };

  if (savedItineraries.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Saved Itineraries</h3>
        <p className="text-muted-foreground mb-4">
          Create and save your first itinerary to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Saved Itineraries</h2>
          <p className="text-muted-foreground">
            {savedItineraries.length} {savedItineraries.length === 1 ? 'itinerary' : 'itineraries'} saved
          </p>
        </div>
        <Button variant="outline" onClick={loadSavedItineraries}>
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {savedItineraries.map((itinerary) => (
          <Card key={itinerary.id} className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5" />
                    {itinerary.title}
                  </CardTitle>
                  <CardDescription className="space-y-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        {format(itinerary.startDate, 'MMM do')} - {format(itinerary.endDate, 'MMM do, yyyy')}
                      </span>
                      {itinerary.isMultiCity && (
                        <Badge variant="outline">Multi-city</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {itinerary.locations.map((location, index) => (
                        <Badge key={location.id} variant="secondary" className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {location.name}
                        </Badge>
                      ))}
                    </div>
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLoadItinerary(itinerary)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Load & Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportItinerary(itinerary)}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Itinerary</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{itinerary.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteItinerary(itinerary.id!)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            {itinerary.events.length > 0 && (
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Events ({itinerary.events.length})</h4>
                  <div className="grid gap-2">
                    {itinerary.events.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <span>{event.date}</span>
                        <span>{event.time}</span>
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                    {itinerary.events.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        ... and {itinerary.events.length - 3} more events
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}