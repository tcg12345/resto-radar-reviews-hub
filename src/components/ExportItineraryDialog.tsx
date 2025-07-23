import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Itinerary } from '@/components/ItineraryBuilder';

interface ExportItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
}

export function ExportItineraryDialog({ isOpen, onClose, itinerary }: ExportItineraryDialogProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!itinerary) return null;

  const generatePDFContent = () => {
    const startDate = format(itinerary.startDate, 'MMMM do, yyyy');
    const endDate = format(itinerary.endDate, 'MMMM do, yyyy');
    
    let content = `${itinerary.title}\n`;
    content += `${startDate} - ${endDate}\n\n`;
    
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      // For now, we'll create a simple text file
      // In a real implementation, you'd use a PDF library like jsPDF
      const content = generatePDFContent();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${itinerary.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Itinerary exported successfully!');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Itinerary
          </DialogTitle>
          <DialogDescription>
            Download your itinerary as a PDF file
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
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Trip Title:</span>
                  <span className="font-medium text-foreground">{itinerary.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-medium text-foreground">
                    {format(itinerary.startDate, 'MMM do')} - {format(itinerary.endDate, 'MMM do')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <span className="font-medium text-foreground">{itinerary.events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Restaurants:</span>
                  <span className="font-medium text-foreground">
                    {itinerary.events.filter(e => e.type === 'restaurant').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <div className="space-y-4">
            <h3 className="font-medium">Export Format</h3>
            
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Text File (TXT)
                </CardTitle>
                <CardDescription>
                  Simple text format with all itinerary details
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                📋 <strong>Note:</strong> PDF export with professional formatting is coming soon! 
                For now, you can export as a text file and convert it to PDF using any word processor.
              </p>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export File'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}