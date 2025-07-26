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

interface ExportItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
}

type ExportFormat = 'pdf' | 'txt' | 'json' | 'csv';

export function ExportItineraryDialog({ isOpen, onClose, itinerary }: ExportItineraryDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');

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
    if (itinerary.locations.length > 0) {
      content += `Destinations: ${itinerary.locations.map(loc => loc.name).join(' → ')}\n\n`;
    }
    
    if (itinerary.events.length > 0) {
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(itinerary.title, margin, yPosition);
    yPosition += 15;

    // Dates
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const startDate = format(itinerary.startDate, 'MMMM do, yyyy');
    const endDate = format(itinerary.endDate, 'MMMM do, yyyy');
    doc.text(`${startDate} - ${endDate}`, margin, yPosition);
    yPosition += 15;

    // Locations
    if (itinerary.locations.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Destinations:', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.text(itinerary.locations.map(loc => loc.name).join(' → '), margin + 5, yPosition);
      yPosition += 15;
    }

    if (itinerary.events.length > 0) {
      const eventsByDate = itinerary.events.reduce((acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      }, {} as Record<string, typeof itinerary.events>);

      Object.entries(eventsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, events]) => {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = margin;
          }

          // Date header
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          const formattedDate = format(new Date(date), 'EEEE, MMMM do');
          doc.text(formattedDate, margin, yPosition);
          yPosition += 10;

          // Events for this date
          events
            .sort((a, b) => a.time.localeCompare(b.time))
            .forEach(event => {
              // Check if we need a new page
              if (yPosition > 260) {
                doc.addPage();
                yPosition = margin;
              }

              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.text(`${event.time} - ${event.title}`, margin + 5, yPosition);
              yPosition += 6;

              doc.setFont('helvetica', 'normal');
              if (event.description) {
                const splitDescription = doc.splitTextToSize(event.description, pageWidth - margin * 2 - 10);
                doc.text(splitDescription, margin + 10, yPosition);
                yPosition += splitDescription.length * 5;
              }

              if (event.restaurantData) {
                doc.text(`Location: ${event.restaurantData.address}`, margin + 10, yPosition);
                yPosition += 5;
                if (event.restaurantData.phone) {
                  doc.text(`Phone: ${event.restaurantData.phone}`, margin + 10, yPosition);
                  yPosition += 5;
                }
                if (event.restaurantData.website) {
                  doc.text(`Website: ${event.restaurantData.website}`, margin + 10, yPosition);
                  yPosition += 5;
                }
              }
              yPosition += 5;
            });
          yPosition += 5;
        });
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
                    <span className="font-medium text-right">{itinerary.events.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Restaurants:</span>
                    <span className="font-medium text-right">
                      {itinerary.events.filter(e => e.type === 'restaurant').length}
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