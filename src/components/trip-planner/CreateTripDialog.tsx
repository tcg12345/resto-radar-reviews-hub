import { useState } from 'react';
import { Plus, MapPin, Calendar, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTrips } from '@/hooks/useTrips';

interface CreateTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTripDialog({ isOpen, onClose }: CreateTripDialogProps) {
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);
  
  const { createTrip } = useTrips();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !destination.trim()) return;

    setIsLoading(true);
    try {
      await createTrip({
        title: title.trim(),
        destination: destination.trim(),
        description: description.trim() || undefined,
        start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        end_date: endDate ? endDate.toISOString().split('T')[0] : undefined,
        is_public: isPublic,
      });
      
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDestination('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setIsPublic(false);
    setIsStartDatePickerOpen(false);
    setIsEndDatePickerOpen(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-primary to-primary/80 rounded-lg text-white">
              <Plus className="w-5 h-5" />
            </div>
            Create New Adventure
          </DialogTitle>
          <DialogDescription className="text-base">
            Start documenting your journey and collect memories from amazing places
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Essential Info */}
          <Card className="border-2 border-primary/10">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Trip Details</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="title">Trip Name *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Paris Weekend, Tokyo Food Adventure, Europe Backpacking"
                  required
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="destination"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g., Paris, France or Multiple Cities"
                    className="pl-10 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What makes this trip special? Share your plans, goals, or memories..."
                  rows={3}
                  className="text-base resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-medium">Travel Dates</h3>
                <span className="text-sm text-muted-foreground">(Optional)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover open={isStartDatePickerOpen} onOpenChange={setIsStartDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsStartDatePickerOpen(!isStartDatePickerOpen);
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : <span>Select start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0 bg-background border shadow-lg" 
                      align="start"
                      side="bottom"
                      sideOffset={4}
                      style={{ zIndex: 9999 }}
                    >
                      <div className="p-3">
                        <CalendarComponent
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date);
                            setIsStartDatePickerOpen(false);
                            // Clear end date if it's before the new start date
                            if (endDate && date && endDate < date) {
                              setEndDate(undefined);
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        {startDate && (
                          <div className="mt-3 pt-3 border-t flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setStartDate(undefined);
                                setIsStartDatePickerOpen(false);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Clear dates
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover open={isEndDatePickerOpen} onOpenChange={setIsEndDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEndDatePickerOpen(!isEndDatePickerOpen);
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : <span>Select end date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0 bg-background border shadow-lg" 
                      align="start"
                      side="bottom"
                      sideOffset={4}
                      style={{ zIndex: 9999 }}
                    >
                      <div className="p-3">
                        <CalendarComponent
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => {
                            setEndDate(date);
                            setIsEndDatePickerOpen(false);
                          }}
                          disabled={(date) => {
                            if (startDate) {
                              return date < startDate;
                            }
                            return date < new Date(new Date().setHours(0, 0, 0, 0));
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                        {endDate && (
                          <div className="mt-3 pt-3 border-t flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEndDate(undefined);
                                setIsEndDatePickerOpen(false);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Clear dates
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <Label htmlFor="isPublic" className="font-medium">
                      Share with friends
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Make this trip visible to your friends so they can see your adventures and ratings
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !title.trim() || !destination.trim()}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {isLoading ? 'Creating...' : 'Create Trip'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}