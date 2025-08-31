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
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">My Trips</h3>
          <p className="text-sm text-muted-foreground">
            {savedItineraries.length} saved
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="h-8 w-8 p-0">
          <Clock className="w-4 h-4 stroke-[1.5]" />
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as ItineraryFilter)} className="w-full">
        {/* Filter Tabs - Segmented Control Style */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 bg-muted/60 rounded-lg border border-border/50">
            <TabsList className="bg-transparent h-auto p-0 gap-1">
              <TabsTrigger 
                value="all" 
                className="px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="current" 
                className="px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Active
              </TabsTrigger>
              <TabsTrigger 
                value="past" 
                className="px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Past
              </TabsTrigger>
              <TabsTrigger 
                value="future" 
                className="px-3 py-2 text-sm font-medium rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Future
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value={filter} className="mt-6">
          {filteredItineraries.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-2">No {filter === 'all' ? '' : filter} itineraries</h4>
              <p className="text-muted-foreground text-sm">
                {filter === 'current' && 'No itineraries are currently active'}
                {filter === 'past' && 'No completed itineraries'}
                {filter === 'future' && 'No upcoming itineraries'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">{filteredItineraries.map((itinerary) => (
                <Card key={itinerary.id} className="rounded-lg border border-border/80 bg-card hover:shadow-md transition-all duration-200">
                  <div className="p-2 space-y-4">
                    {/* Trip Header */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground leading-tight">
                        {itinerary.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 stroke-[1.5]" />
                        <span>
                          {format(itinerary.startDate, 'MMM do')} - {format(itinerary.endDate, 'MMM do, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {itinerary.locations.map((location) => (
                        <Badge key={location.id} variant="outline" className="text-xs border-border/60 bg-muted/30">
                          {location.name}
                        </Badge>
                      ))}
                      {itinerary.isMultiCity && (
                        <Badge variant="secondary" className="text-xs">
                          Multi-city
                        </Badge>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate(`/itinerary/${itinerary.id}`)}
                        className="h-8 text-xs font-medium"
                      >
                        <Eye className="w-3 h-3 mr-1.5 stroke-[1.5]" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLoadItinerary(itinerary)}
                        className="h-8 text-xs font-medium border-border/60"
                      >
                        <Edit className="w-3 h-3 mr-1.5 stroke-[1.5]" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportItinerary(itinerary)}
                        className="h-8 text-xs font-medium border-border/60"
                      >
                        <Download className="w-3 h-3 mr-1.5 stroke-[1.5]" />
                        Export
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium border-border/60 text-destructive hover:text-destructive hover:border-destructive/30"
                          >
                            <Trash2 className="w-3 h-3 mr-1.5 stroke-[1.5]" />
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

                    {/* Events Preview */}
                    {itinerary.events.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {itinerary.events.length} Events
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {itinerary.events.slice(0, 3).map((event) => (
                            <Badge key={event.id} variant="secondary" className="text-xs bg-muted/50">
                              {event.type}
                            </Badge>
                          ))}
                          {itinerary.events.length > 3 && (
                            <Badge variant="outline" className="text-xs border-border/60">
                              +{itinerary.events.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}