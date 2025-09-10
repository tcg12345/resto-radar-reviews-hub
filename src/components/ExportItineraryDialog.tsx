import { useState } from 'react';
import { Download, FileText, FileJson, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Itinerary } from '@/components/ItineraryBuilder';
import jsPDF from 'jspdf';
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ExportItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
}

type ExportFormat = 'pdf' | 'txt' | 'json' | 'csv';

export function ExportItineraryDialog({ isOpen, onClose, itinerary }: ExportItineraryDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const isMobile = useIsMobile();

  if (!itinerary) return null;

  const formatOptions = [
    {
      value: 'pdf' as const,
      label: 'PDF Document',
      description: 'Professional PDF with formatted layout',
      icon: Printer,
      popular: true
    },
    {
      value: 'txt' as const,
      label: 'Text File',
      description: 'Simple text format for easy sharing',
      icon: FileText,
      popular: false
    },
    {
      value: 'json' as const,
      label: 'JSON Data',
      description: 'Structured data for developers',
      icon: FileJson,
      popular: false
    },
    {
      value: 'csv' as const,
      label: 'CSV Spreadsheet',
      description: 'Import into Excel or Google Sheets',
      icon: FileSpreadsheet,
      popular: false
    }
  ];

  const generateTextContent = () => {
    const startDate = format(itinerary.startDate, 'MMMM do, yyyy');
    const endDate = format(itinerary.endDate, 'MMMM do, yyyy');
    
    let content = `${itinerary.title}\n`;
    content += `${startDate} - ${endDate}\n\n`;
    
    // Add locations
    if (itinerary.locations && itinerary.locations.length > 0) {
      content += `Destinations: ${itinerary.locations.map(loc => loc.name).join(' → ')}\n\n`;
    }
    
    if (itinerary.events && itinerary.events.length > 0) {
      const eventsByDate = itinerary.events.reduce((acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      }, {} as Record<string, typeof itinerary.events>);

      Object.entries(eventsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, events]) => {
          const formattedDate = format(new Date(date), 'EEEE, MMMM do');
          content += `${formattedDate}\n`;
          content += '─'.repeat(50) + '\n\n';
          
          events
            .sort((a, b) => a.time.localeCompare(b.time))
            .forEach(event => {
              content += `${event.time} - ${event.title}\n`;
              if (event.description) {
                content += `   ${event.description}\n`;
              }
              if (event.restaurantData) {
                content += `   Location: ${event.restaurantData.address}\n`;
                if (event.restaurantData.phone) {
                  content += `   Phone: ${event.restaurantData.phone}\n`;
                }
                if (event.restaurantData.website) {
                  content += `   Website: ${event.restaurantData.website}\n`;
                }
              }
              content += '\n';
            });
          content += '\n';
        });
    } else {
      content += 'No events scheduled.\n';
    }
    
    return content;
  };

  const generatePDF = () => {
    console.log('ExportItineraryDialog - generatePDF called with itinerary:', {
      title: itinerary.title,
      wasCreatedWithLengthOfStay: itinerary.wasCreatedWithLengthOfStay,
      eventsCount: itinerary.events ? itinerary.events.length : 0
    });
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
    doc.text(`${itinerary.events ? itinerary.events.length : 0} events planned`, margin + 35, yPosition + 35);
    
    yPosition += 55;

    // Statistics section
    checkNewPage(25);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Trip Statistics', margin, yPosition);
    yPosition += 10;

    const restaurantCount = itinerary.events ? itinerary.events.filter(e => e.type === 'restaurant').length : 0;
    const attractionCount = itinerary.events ? itinerary.events.filter(e => e.type === 'attraction').length : 0;
    const otherCount = itinerary.events ? itinerary.events.filter(e => e.type === 'other').length : 0;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Restaurants: ${restaurantCount}`, margin + 5, yPosition);
    doc.text(`Attractions: ${attractionCount}`, margin + 60, yPosition);
    doc.text(`Other Events: ${otherCount}`, margin + 120, yPosition);
    yPosition += 20;

    // Detailed itinerary section
    if (itinerary.events && itinerary.events.length > 0) {
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
          console.log('ExportItineraryDialog - PDF generation - checking date display:', { 
            wasCreatedWithLengthOfStay: itinerary.wasCreatedWithLengthOfStay, 
            dayIndex: dayIndex + 1,
            date 
          });
          
          if (itinerary.wasCreatedWithLengthOfStay) {
            console.log('ExportItineraryDialog - Using length of stay mode - showing only day number');
            doc.text(`Day ${dayIndex + 1}`, margin + 5, yPosition);
          } else {
            console.log('ExportItineraryDialog - Using dates mode - showing day number and date');
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
                const splitDescription = doc.splitTextToSize(event.description || '', pageWidth - margin * 2 - 20);
                doc.text(splitDescription, margin + 15, yPosition);
                yPosition += (Array.isArray(splitDescription) ? splitDescription.length : 1) * 4 + 3;
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
                  const websiteText = (event.restaurantData.website || '').length > 50 
                    ? (event.restaurantData.website || '').substring(0, 47) + '...'
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
                  const websiteText = (event.attractionData.website || '').length > 50 
                    ? (event.attractionData.website || '').substring(0, 47) + '...'
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

    // Hotels section (if any)
    if (itinerary.hotels && itinerary.hotels.length > 0) {
      checkNewPage(25);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Accommodations', margin, yPosition);
      yPosition += 15;

      itinerary.hotels.forEach((hotel, index) => {
        checkNewPage(20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`[Hotel] ${hotel.hotel.name}`, margin + 5, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        
        if (hotel.hotel.address) {
          doc.text(`Address: ${hotel.hotel.address}`, margin + 10, yPosition);
          yPosition += 5;
        }
        
        if (hotel.checkIn && hotel.checkOut) {
          const checkInStr = format(hotel.checkIn, 'MMM do, yyyy');
          const checkOutStr = format(hotel.checkOut, 'MMM do, yyyy');
          doc.text(`Dates: ${checkInStr} - ${checkOutStr}`, margin + 10, yPosition);
          yPosition += 5;
        }
        
        if (hotel.hotel.rating) {
          doc.text(`Rating: ${hotel.hotel.rating}`, margin + 10, yPosition);
          yPosition += 5;
        }
        
        doc.setTextColor(0, 0, 0);
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

    return doc;
  };

  const generateJSON = () => {
    return {
      itinerary: {
        ...itinerary,
        exportedAt: new Date().toISOString(),
        format: 'json'
      }
    };
  };

  const generateCSV = () => {
    let csv = 'Date,Time,Title,Type,Description,Location,Phone,Website\n';
    
    itinerary.events.forEach(event => {
      const date = event.date;
      const time = event.time;
      const title = `"${event.title.replace(/"/g, '""')}"`;
      const type = event.type;
      const description = `"${(event.description || '').replace(/"/g, '""')}"`;
      const location = event.restaurantData?.address ? `"${event.restaurantData.address.replace(/"/g, '""')}"` : '';
      const phone = event.restaurantData?.phone || '';
      const website = event.restaurantData?.website || '';
      
      csv += `${date},${time},${title},${type},${description},${location},${phone},${website}\n`;
    });
    
    return csv;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const fileName = itinerary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      switch (selectedFormat) {
        case 'pdf':
          const doc = generatePDF();
          doc.save(`${fileName}_itinerary.pdf`);
          break;
          
        case 'txt':
          const textContent = generateTextContent();
          const txtBlob = new Blob([textContent], { type: 'text/plain' });
          const txtUrl = URL.createObjectURL(txtBlob);
          const txtLink = document.createElement('a');
          txtLink.href = txtUrl;
          txtLink.download = `${fileName}_itinerary.txt`;
          document.body.appendChild(txtLink);
          txtLink.click();
          document.body.removeChild(txtLink);
          URL.revokeObjectURL(txtUrl);
          break;
          
        case 'json':
          const jsonData = generateJSON();
          const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = `${fileName}_itinerary.json`;
          document.body.appendChild(jsonLink);
          jsonLink.click();
          document.body.removeChild(jsonLink);
          URL.revokeObjectURL(jsonUrl);
          break;
          
        case 'csv':
          const csvContent = generateCSV();
          const csvBlob = new Blob([csvContent], { type: 'text/csv' });
          const csvUrl = URL.createObjectURL(csvBlob);
          const csvLink = document.createElement('a');
          csvLink.href = csvUrl;
          csvLink.download = `${fileName}_itinerary.csv`;
          document.body.appendChild(csvLink);
          csvLink.click();
          document.body.removeChild(csvLink);
          URL.revokeObjectURL(csvUrl);
          break;
          
        default:
          throw new Error('Unsupported format');
      }
      
      toast.success(`Itinerary exported as ${selectedFormat.toUpperCase()} successfully!`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export itinerary');
    } finally {
      setIsExporting(false);
    }
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="w-full">
            <div className="sticky top-0 z-10 border-b border-border/50 bg-gradient-to-b from-background/95 via-background to-background/80 px-5 pt-4 pb-3">
              <div className="space-y-0.5">
                <DrawerTitle className="text-base font-semibold">Export Itinerary</DrawerTitle>
                <DrawerDescription className="text-xs text-muted-foreground">Choose your preferred format to download your itinerary</DrawerDescription>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="space-y-6">
                {/* Export Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Export Preview
                    </CardTitle>
                    <CardDescription>
                      Your itinerary will be exported with all events and details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trip Title:</span>
                          <span className="font-medium text-right">{itinerary.title}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium text-right">
                            {format(itinerary.startDate, 'MMM do')} - {format(itinerary.endDate, 'MMM do')}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Events:</span>
                          <span className="font-medium text-right">{itinerary.events ? itinerary.events.length : 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Restaurants:</span>
                          <span className="font-medium text-right">
                            {itinerary.events ? itinerary.events.filter(e => e.type === 'restaurant').length : 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Export Format Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium">Choose Export Format</h3>
                  
                  <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
                    <div className="grid gap-3">
                      {formatOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <div key={option.value} className="relative">
                            <RadioGroupItem
                              value={option.value}
                              id={option.value}
                              className="sr-only"
                            />
                            <Label
                              htmlFor={option.value}
                              className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                selectedFormat === option.value
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border hover:border-primary/50'
                              }`}
                            >
                              <Icon className="w-5 h-5 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{option.label}</span>
                                  {option.popular && (
                                    <Badge variant="secondary" className="text-xs">Popular</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {option.description}
                                </p>
                              </div>
                              <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                                selectedFormat === option.value
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground/30'
                              }`}>
                                {selectedFormat === option.value && (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  </div>
                                )}
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <DrawerFooter>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} disabled={isExporting}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Itinerary
          </DialogTitle>
          <DialogDescription>
            Choose your preferred format to download your itinerary
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Export Preview
              </CardTitle>
              <CardDescription>
                Your itinerary will be exported with all events and details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trip Title:</span>
                    <span className="font-medium text-right">{itinerary.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium text-right">
                      {format(itinerary.startDate, 'MMM do')} - {format(itinerary.endDate, 'MMM do')}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Events:</span>
                    <span className="font-medium text-right">{itinerary.events ? itinerary.events.length : 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Restaurants:</span>
                    <span className="font-medium text-right">
                      {itinerary.events ? itinerary.events.filter(e => e.type === 'restaurant').length : 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Format Selection */}
          <div className="space-y-4">
            <h3 className="font-medium">Choose Export Format</h3>
            
            <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as ExportFormat)}>
              <div className="grid gap-3">
                {formatOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div key={option.value} className="relative">
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="sr-only"
                      />
                      <Label
                        htmlFor={option.value}
                        className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                          selectedFormat === option.value
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.label}</span>
                            {option.popular && (
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {option.description}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 transition-colors ${
                          selectedFormat === option.value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/30'
                        }`}>
                          {selectedFormat === option.value && (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isExporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}