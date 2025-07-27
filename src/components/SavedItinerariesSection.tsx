import { useState, useEffect } from 'react';
import { format, isAfter, isBefore, startOfToday } from 'date-fns';
import { Calendar, MapPin, Clock, Edit, Trash2, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Itinerary } from '@/components/ItineraryBuilder';
import jsPDF from 'jspdf';

interface SavedItinerariesSectionProps {
  onLoadItinerary: (itinerary: Itinerary) => void;
}

type ItineraryFilter = 'all' | 'current' | 'past' | 'future';

export function SavedItinerariesSection({ onLoadItinerary }: SavedItinerariesSectionProps) {
  const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);
  const [filter, setFilter] = useState<ItineraryFilter>('all');

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
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      let currentY = margin;

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(itinerary.title, margin, currentY);
      currentY += lineHeight * 2;

      // Date range
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const dateRange = `${format(itinerary.startDate, 'MMMM do, yyyy')} - ${format(itinerary.endDate, 'MMMM do, yyyy')}`;
      pdf.text(dateRange, margin, currentY);
      currentY += lineHeight * 1.5;

      // Locations
      if (itinerary.locations.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Locations:', margin, currentY);
        currentY += lineHeight;
        
        pdf.setFont('helvetica', 'normal');
        const locations = itinerary.locations.map(loc => loc.name).join(' → ');
        const locationLines = pdf.splitTextToSize(locations, pageWidth - margin * 2);
        pdf.text(locationLines, margin, currentY);
        currentY += lineHeight * locationLines.length + lineHeight;
      }

      // Events
      if (itinerary.events.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Events:', margin, currentY);
        currentY += lineHeight * 1.5;

        itinerary.events.forEach((event, index) => {
          // Check if we need a new page
          if (currentY > pageHeight - margin * 3) {
            pdf.addPage();
            currentY = margin;
          }

          // Event header
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          const eventHeader = `${event.date} ${event.time} - ${event.title}`;
          const headerLines = pdf.splitTextToSize(eventHeader, pageWidth - margin * 2);
          pdf.text(headerLines, margin, currentY);
          currentY += lineHeight * headerLines.length;

          // Event type badge
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text(`Type: ${event.type}`, margin + 10, currentY);
          currentY += lineHeight;

          // Event description
          if (event.description) {
            pdf.setFontSize(10);
            const descLines = pdf.splitTextToSize(event.description, pageWidth - margin * 2 - 10);
            pdf.text(descLines, margin + 10, currentY);
            currentY += lineHeight * descLines.length;
          }

          // Restaurant/attraction details
          if (event.type === 'restaurant' && event.restaurantData) {
            pdf.setFontSize(9);
            if (event.restaurantData.address) {
              pdf.text(`📍 ${event.restaurantData.address}`, margin + 10, currentY);
              currentY += lineHeight;
            }
            if (event.restaurantData.phone) {
              pdf.text(`📞 ${event.restaurantData.phone}`, margin + 10, currentY);
              currentY += lineHeight;
            }
          }

          if (event.attractionData) {
            pdf.setFontSize(9);
            if (event.attractionData.address) {
              pdf.text(`📍 ${event.attractionData.address}`, margin + 10, currentY);
              currentY += lineHeight;
            }
            if (event.attractionData.phone) {
              pdf.text(`📞 ${event.attractionData.phone}`, margin + 10, currentY);
              currentY += lineHeight;
            }
          }

          currentY += lineHeight * 0.5; // Space between events
        });
      }

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        pdf.text(`Generated on ${format(new Date(), 'MMMM do, yyyy')}`, margin, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `${itinerary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      pdf.save(fileName);
      
      toast.success('Itinerary exported as PDF successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export itinerary as PDF');
    }
  };

  // Filter itineraries based on selected filter
  const getFilteredItineraries = () => {
    const today = startOfToday();
    
    return savedItineraries.filter(itinerary => {
      switch (filter) {
        case 'current':
          return !isBefore(itinerary.endDate, today) && !isAfter(itinerary.startDate, today);
        case 'past':
          return isBefore(itinerary.endDate, today);
        case 'future':
          return isAfter(itinerary.startDate, today);
        default:
          return true;
      }
    });
  };

  const filteredItineraries = getFilteredItineraries();

  const getFilterCounts = () => {
    const today = startOfToday();
    return {
      all: savedItineraries.length,
      current: savedItineraries.filter(it => !isBefore(it.endDate, today) && !isAfter(it.startDate, today)).length,
      past: savedItineraries.filter(it => isBefore(it.endDate, today)).length,
      future: savedItineraries.filter(it => isAfter(it.startDate, today)).length,
    };
  };

  const counts = getFilterCounts();

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Saved Itineraries</h3>
          <p className="text-muted-foreground">
            {savedItineraries.length} {savedItineraries.length === 1 ? 'itinerary' : 'itineraries'} saved
          </p>
        </div>
        <Button variant="outline" onClick={loadSavedItineraries}>
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as ItineraryFilter)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="current" className="flex items-center gap-2">
            Current ({counts.current})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            Past ({counts.past})
          </TabsTrigger>
          <TabsTrigger value="future" className="flex items-center gap-2">
            Future ({counts.future})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredItineraries.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-2">No {filter === 'all' ? '' : filter} itineraries</h4>
              <p className="text-muted-foreground text-sm">
                {filter === 'current' && 'No itineraries are currently active'}
                {filter === 'past' && 'No completed itineraries'}
                {filter === 'future' && 'No upcoming itineraries'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredItineraries.map((itinerary) => (
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}