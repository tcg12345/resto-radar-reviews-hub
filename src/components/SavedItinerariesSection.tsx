import { useState, useEffect } from 'react';
import { format, isAfter, isBefore, startOfToday } from 'date-fns';
import { Calendar, MapPin, Clock, Edit, Trash2, Download, Filter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Itinerary } from '@/components/ItineraryBuilder';
import { useItineraries } from '@/hooks/useItineraries';
import jsPDF from 'jspdf';

interface SavedItinerariesSectionProps {
  onLoadItinerary: (itinerary: Itinerary) => void;
}

type ItineraryFilter = 'all' | 'current' | 'past' | 'future';

export function SavedItinerariesSection({ onLoadItinerary }: SavedItinerariesSectionProps) {
  const [filter, setFilter] = useState<ItineraryFilter>('all');
  const navigate = useNavigate();
  const { itineraries: savedItineraries, loading, deleteItinerary: removeItinerary, refetch } = useItineraries();

  const deleteItinerary = (itineraryId: string) => {
    removeItinerary(itineraryId);
  };

  const exportItinerary = (itinerary: Itinerary) => {
    console.log('Exporting itinerary:', { 
      title: itinerary.title, 
      wasCreatedWithLengthOfStay: itinerary.wasCreatedWithLengthOfStay,
      eventsCount: itinerary.events.length 
    });
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      let yPosition = margin;

      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace: number = 15) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Helper function to add a line
      const addLine = (startX: number, startY: number, endX: number, endY: number, color: string = '#E5E7EB') => {
        doc.setDrawColor(color);
        doc.setLineWidth(0.5);
        doc.line(startX, startY, endX, endY);
      };

      // Header section with better styling
      doc.setFillColor(59, 130, 246); // Blue background
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255); // White text
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(itinerary.title, margin, 25);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      yPosition = 55;

      // Trip overview section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Trip Overview', margin, yPosition);
      yPosition += 12;

      // Trip details box
      doc.setFillColor(249, 250, 251); // Light gray background
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 45, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      const startDate = format(itinerary.startDate, 'EEEE, MMMM do, yyyy');
      const endDate = format(itinerary.endDate, 'EEEE, MMMM do, yyyy');
      const duration = Math.ceil((itinerary.endDate.getTime() - itinerary.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      doc.setFont('helvetica', 'bold');
      doc.text('Dates:', margin + 5, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${startDate} - ${endDate}`, margin + 35, yPosition + 5);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Duration:', margin + 5, yPosition + 15);
      doc.setFont('helvetica', 'normal');
      doc.text(`${duration} ${duration === 1 ? 'day' : 'days'}`, margin + 35, yPosition + 15);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Destinations:', margin + 5, yPosition + 25);
      doc.setFont('helvetica', 'normal');
      const destinationsText = itinerary.locations.map(loc => loc.name).join(' → ');
      const splitDestinations = doc.splitTextToSize(destinationsText, pageWidth - margin * 2 - 40);
      doc.text(splitDestinations, margin + 35, yPosition + 25);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Total Events:', margin + 5, yPosition + 35);
      doc.setFont('helvetica', 'normal');
      doc.text(`${itinerary.events.length} events planned`, margin + 35, yPosition + 35);
      
      yPosition += 55;

      // Statistics section
      checkNewPage(25);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Trip Statistics', margin, yPosition);
      yPosition += 10;

      const restaurantCount = itinerary.events.filter(e => e.type === 'restaurant').length;
      const attractionCount = itinerary.events.filter(e => e.type === 'attraction').length;
      const otherCount = itinerary.events.filter(e => e.type === 'other').length;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Restaurants: ${restaurantCount}`, margin + 5, yPosition);
      doc.text(`Attractions: ${attractionCount}`, margin + 60, yPosition);
      doc.text(`Other Events: ${otherCount}`, margin + 120, yPosition);
      yPosition += 20;

        // Detailed itinerary section
        if (itinerary.events.length > 0) {
          checkNewPage(25);
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('Detailed Itinerary', margin, yPosition);
          yPosition += 15;

          const eventsByDate = itinerary.events.reduce((acc, event) => {
            if (!acc[event.date]) acc[event.date] = [];
            acc[event.date].push(event);
            return acc;
          }, {} as Record<string, typeof itinerary.events>);

          Object.entries(eventsByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([date, events], dayIndex) => {
              checkNewPage(30);

              // Date header with background
              doc.setFillColor(239, 246, 255); // Light blue background
              doc.rect(margin, yPosition - 8, pageWidth - 2 * margin, 20, 'F');
              
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              
              // Show dates only if not created with length of stay mode
              console.log('PDF generation - checking date display:', { 
                wasCreatedWithLengthOfStay: itinerary.wasCreatedWithLengthOfStay, 
                dayIndex: dayIndex + 1,
                date 
              });
              
              if (itinerary.wasCreatedWithLengthOfStay) {
                console.log('Using length of stay mode - showing only day number');
                doc.text(`Day ${dayIndex + 1}`, margin + 5, yPosition);
              } else {
                console.log('Using dates mode - showing day number and date');
                const formattedDate = format(new Date(date), 'EEEE, MMMM do');
                doc.text(`Day ${dayIndex + 1} - ${formattedDate}`, margin + 5, yPosition);
              }
              yPosition += 20;

            // Events for this date
            events
              .sort((a, b) => a.time.localeCompare(b.time))
              .forEach((event, eventIndex) => {
                checkNewPage(25);

                // Event time with icon based on type
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                const eventIcon = event.type === 'restaurant' ? '[Restaurant]' : 
                                 event.type === 'attraction' ? '[Attraction]' : '[Event]';
                doc.text(`${event.time}  ${eventIcon}  ${event.title}`, margin + 10, yPosition);
                yPosition += 8;

                // Event description
                if (event.description) {
                  doc.setFontSize(10);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(75, 85, 99); // Gray text
                  const splitDescription = doc.splitTextToSize(event.description, pageWidth - margin * 2 - 20);
                  doc.text(splitDescription, margin + 15, yPosition);
                  yPosition += splitDescription.length * 4 + 3;
                }

                // Location details for restaurants
                if (event.restaurantData) {
                  doc.setFontSize(9);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(107, 114, 128); // Lighter gray
                  
                  // Address
                  if (event.restaurantData.address) {
                    doc.text(`Address: ${event.restaurantData.address}`, margin + 15, yPosition);
                    yPosition += 4;
                  }
                  
                  // Phone
                  if (event.restaurantData.phone) {
                    doc.text(`Phone: ${event.restaurantData.phone}`, margin + 15, yPosition);
                    yPosition += 4;
                  }
                  
                  // Website
                  if (event.restaurantData.website) {
                    const websiteText = event.restaurantData.website.length > 50 
                      ? event.restaurantData.website.substring(0, 47) + '...'
                      : event.restaurantData.website;
                    doc.text(`Website: ${websiteText}`, margin + 15, yPosition);
                    yPosition += 4;
                  }
                }

                // Attraction details
                if (event.attractionData) {
                  doc.setFontSize(9);
                  doc.setFont('helvetica', 'normal');
                  doc.setTextColor(107, 114, 128);
                  
                  if (event.attractionData.address) {
                    doc.text(`Address: ${event.attractionData.address}`, margin + 15, yPosition);
                    yPosition += 4;
                  }
                  
                  if (event.attractionData.category) {
                    doc.text(`Category: ${event.attractionData.category}`, margin + 15, yPosition);
                    yPosition += 4;
                  }
                  
                  if (event.attractionData.rating) {
                    doc.text(`Rating: ${event.attractionData.rating}/10`, margin + 15, yPosition);
                    yPosition += 4;
                  }
                  
                  if (event.attractionData.website) {
                    const websiteText = event.attractionData.website.length > 50 
                      ? event.attractionData.website.substring(0, 47) + '...'
                      : event.attractionData.website;
                    doc.text(`Website: ${websiteText}`, margin + 15, yPosition);
                    yPosition += 4;
                  }
                }

                // Reset text color and add spacing
                doc.setTextColor(0, 0, 0);
                yPosition += 8;

                // Add a subtle line between events (except for the last one)
                if (eventIndex < events.length - 1) {
                  addLine(margin + 10, yPosition - 4, pageWidth - margin - 10, yPosition - 4, '#E5E7EB');
                }
              });
            
            yPosition += 10;
          });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(156, 163, 175); // Gray text
        doc.text(`Generated on ${format(new Date(), 'MMMM do, yyyy')}`, margin, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `${itinerary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      doc.save(fileName);
      
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
      {/* Desktop Header */}
      <div className="hidden md:flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Saved Itineraries</h3>
          <p className="text-muted-foreground">
            {savedItineraries.length} {savedItineraries.length === 1 ? 'itinerary' : 'itineraries'} saved
          </p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading}>
          <Clock className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Mobile Header - Compact */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">My Trips</h3>
          <p className="text-sm text-muted-foreground">
            {savedItineraries.length} saved
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          <Clock className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as ItineraryFilter)} className="w-full">
        {/* Desktop Tabs */}
        <TabsList className="hidden md:grid w-full grid-cols-4">
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

        {/* Mobile Tabs - Compact */}
        <TabsList className="md:hidden grid w-full grid-cols-4 h-8">
          <TabsTrigger value="all" className="text-xs px-1">
            All
          </TabsTrigger>
          <TabsTrigger value="current" className="text-xs px-1">
            Active
          </TabsTrigger>
          <TabsTrigger value="past" className="text-xs px-1">
            Past
          </TabsTrigger>
          <TabsTrigger value="future" className="text-xs px-1">
            Future
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
            <div className="grid gap-3 md:gap-4">
              {filteredItineraries.map((itinerary) => (
                <Card key={itinerary.id} className="mx-1 md:mx-0 transition-all duration-300 hover:shadow-xl border-0 bg-gradient-to-br from-background via-background/95 to-accent/5 ring-1 ring-border/20 hover:ring-primary/30 active:scale-[0.98] md:hover:scale-[1.01] md:active:scale-100 rounded-xl overflow-hidden">
                  {/* Desktop Layout */}
                  <div className="hidden md:block">
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
                            onClick={() => navigate(`/itinerary/${itinerary.id}`)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLoadItinerary(itinerary)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
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
                  </div>

                  {/* Mobile Layout - Modern Edge-to-Edge Design */}
                  <div className="md:hidden">
                    <div className="p-5 space-y-4">
                      {/* Header Section */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold leading-tight text-foreground">
                          {itinerary.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {format(itinerary.startDate, 'MMM do')} - {format(itinerary.endDate, 'MMM do, yyyy')}
                          </span>
                        </div>
                      </div>

                      {/* Locations Section - Enhanced with better styling */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-muted-foreground">Destinations</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                          {itinerary.locations.map((location) => (
                            <Badge 
                              key={location.id} 
                              variant="secondary" 
                              className="flex items-center gap-1.5 text-xs whitespace-nowrap flex-shrink-0 px-3 py-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
                            >
                              {location.name}
                            </Badge>
                          ))}
                          {itinerary.isMultiCity && (
                            <Badge 
                              variant="outline" 
                              className="text-xs whitespace-nowrap flex-shrink-0 px-3 py-1.5 border-accent bg-accent/10 text-accent-foreground"
                            >
                              Multi-city
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons - Modern Grid Layout */}
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate(`/itinerary/${itinerary.id}`)}
                            className="h-10 font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Trip
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLoadItinerary(itinerary)}
                            className="h-10 font-medium border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportItinerary(itinerary)}
                          className="w-full h-10 font-medium border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Itinerary
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-10 font-medium text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Trip
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
                  </div>
                  
                  {itinerary.events.length > 0 && (
                    <CardContent className="pt-0">
                      <Separator className="mb-4" />
                      <div className="space-y-2">
                        {/* Desktop Events Layout */}
                        <div className="hidden md:block">
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

                        {/* Mobile Events Layout - More compact */}
                        <div className="md:hidden">
                          <h4 className="font-medium text-xs mb-2 text-muted-foreground">
                            {itinerary.events.length} Events
                          </h4>
                          <div className="flex gap-1 flex-wrap">
                            {itinerary.events.slice(0, 2).map((event) => (
                              <Badge key={event.id} variant="outline" className="text-xs">
                                {event.type}
                              </Badge>
                            ))}
                            {itinerary.events.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{itinerary.events.length - 2}
                              </Badge>
                            )}
                          </div>
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