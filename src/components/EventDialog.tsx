import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, Search, Utensils, MapPinIcon, ExternalLink, Phone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { InlineRestaurantSearch } from '@/components/InlineRestaurantSearch';
import { AttractionsSearch } from '@/components/AttractionsSearch';
import { ItineraryEvent } from '@/components/ItineraryBuilder';
interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<ItineraryEvent, 'id'>, selectedDates?: string[]) => void;
  selectedDate: string | null;
  editingEvent: ItineraryEvent | null;
  itineraryLocation?: string;
  availableDates?: string[]; // Available trip dates for multi-day selection
  isDayMode?: boolean; // Whether the trip uses day numbers instead of dates
}
interface RestaurantData {
  name: string;
  address: string;
  placeId?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
}
interface AttractionData {
  id: string;
  name: string;
  address: string;
  category?: string;
  placeType?: 'hotel' | 'restaurant' | 'attraction' | 'museum' | 'park' | 'monument' | 'shopping' | 'entertainment' | 'other';
  rating?: number;
  website?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}
export function EventDialog({
  isOpen,
  onClose,
  onSave,
  selectedDate,
  editingEvent,
  itineraryLocation,
  availableDates = [],
  isDayMode = false
}: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [time, setTime] = useState('');
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('PM');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);
  const [is24Hour, setIs24Hour] = useState(false);
  const [type, setType] = useState<'restaurant' | 'hotel' | 'attraction' | 'museum' | 'park' | 'monument' | 'shopping' | 'entertainment' | 'other'>('other');
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [location, setLocation] = useState<string>('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationTimeout, setLocationTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isMultiDayEvent, setIsMultiDayEvent] = useState(false);
  
  // Custom links state
  const [customLinks, setCustomLinks] = useState<string[]>([]);
  const [newLinkInput, setNewLinkInput] = useState('');

  // URL validation function
  const isValidUrl = (url: string) => {
    try {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) return false;
      
      // Check if it starts with http:// or https://
      if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
        new URL(trimmedUrl);
        return true;
      }
      
      // Check if it's a valid domain without protocol
      const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}([\/\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
      return domainPattern.test(trimmedUrl);
    } catch {
      return false;
    }
  };

  // Reset form when dialog opens/closes or editing event changes
  useEffect(() => {
    if (isOpen && editingEvent) {
      // Handle all event types
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setPrice(editingEvent.price || '');
      setTime(editingEvent.time);
      setType(editingEvent.type);
      setRestaurantData(editingEvent.restaurantData || null);
      setAttractionData(editingEvent.attractionData || null);
      setSelectedDates([editingEvent.date]);
      setIsMultiDayEvent(false);
      // Handle custom links - parse from description if stored there
      if (editingEvent.description) {
        const linkPattern = /^https?:\/\/[^\s]+$/gm;
        const foundLinks = editingEvent.description.match(linkPattern) || [];
        const cleanDescription = editingEvent.description.replace(linkPattern, '').trim();
        setCustomLinks(foundLinks);
        setDescription(cleanDescription);
      } else {
        setCustomLinks([]);
      }
      setNewLinkInput('');
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setPrice('');
      setTime('');
      setType('other');
      setRestaurantData(null);
      setAttractionData(null);
      setCustomLinks([]);
      setNewLinkInput('');
      // If selectedDate is empty, this is a main add event (multi-day capable)
      if (!selectedDate) {
        setSelectedDates([]);
        setIsMultiDayEvent(true);
      } else {
        setSelectedDates([selectedDate]);
        setIsMultiDayEvent(false);
      }
    }
  }, [isOpen, editingEvent, selectedDate]);
  const handleSave = () => {
    if (!title.trim() || !time) return;
    
    // For multi-day events, require at least one date selection
    if (isMultiDayEvent && selectedDates.length === 0) return;
    
    // For single-day events, require the selectedDate
    if (!isMultiDayEvent && !selectedDate) return;
    
    // Combine description and links
    const combinedDescription = [description.trim(), ...customLinks].filter(Boolean).join('\n').trim() || undefined;
    
    const eventData: Omit<ItineraryEvent, 'id'> = {
      title: title.trim(),
      description: combinedDescription,
      price: price.trim() || undefined,
      time,
      date: isMultiDayEvent ? selectedDates[0] : selectedDate!, // Default to first selected date
      type,
      location: location.trim() || undefined, // Include location for "other" type events
      restaurantData: type === 'restaurant' ? restaurantData : undefined,
      attractionData: attractionData // Always include attraction data if it exists
    };
    
    // Pass selected dates for multi-day events
    onSave(eventData, isMultiDayEvent ? selectedDates : undefined);
    handleClose();
  };
  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setTime('');
    setType('other');
    setRestaurantData(null);
    setAttractionData(null);
    setCustomLinks([]);
    setNewLinkInput('');
    onClose();
  };
  const handleAttractionSelect = (attraction: AttractionData | null) => {
    console.log('Selected attraction data:', attraction); // Debug log
    setAttractionData(attraction);
    if (attraction) {
      setTitle(attraction.name);
      // Use the AI-determined place type or default to attraction
      setType(attraction.placeType || 'attraction');
    }
  };

  // Location search function
  const searchLocation = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: query,
          location: '',
          type: 'search'
        }
      });

      if (error) throw error;

      setLocationSuggestions(data?.results || []);
      setShowLocationSuggestions(true);
    } catch (error) {
      console.error('Error searching locations:', error);
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  };

  // Handle location input change with debouncing
  const handleLocationChange = (value: string) => {
    setLocation(value);
    
    // Simple debouncing
    if (locationTimeout) {
      clearTimeout(locationTimeout);
    }
    const timeout = setTimeout(() => {
      searchLocation(value);
    }, 300);
    setLocationTimeout(timeout);
  };

  // Handle location selection
  const handleLocationSelect = (suggestion: any) => {
    setLocation(suggestion.formatted_address || suggestion.name);
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
  };
  const formattedDate = selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM do') : '';
  const isMobile = useIsMobile();

  const formContent = (
    <div className="space-y-6">
      {/* Event Type Selection */}
      <div className="space-y-3">
        <Label>Event Type</Label>
        <Tabs value={type} onValueChange={value => setType(value as typeof type)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="restaurant" className="flex items-center gap-1 text-xs">
              <Utensils className="w-3 h-3" />
              Restaurant
            </TabsTrigger>
            <TabsTrigger value="attraction" className="flex items-center gap-1 text-xs">
              <MapPinIcon className="w-3 h-3" />
              Places
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3" />
              Other
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurant" className="space-y-4">
            {restaurantData && restaurantData.name ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{restaurantData.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {restaurantData.address}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Restaurant</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setRestaurantData(null);
                      setTitle('');
                    }}
                  >
                    Change Restaurant
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Search for restaurants, cafes, and dining places.
                </p>
                <InlineRestaurantSearch 
                  value={restaurantData}
                  onRestaurantSelect={(restaurant) => {
                    console.log('Selected restaurant data:', restaurant);
                    setRestaurantData(restaurant);
                    setTitle(restaurant.name);
                    setType('restaurant');
                  }}
                  location={itineraryLocation}
                  placeholder="Search for restaurants..."
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="attraction" className="space-y-4">
            {attractionData ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{attractionData.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {attractionData.address}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{attractionData.category || 'Attraction'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAttractionData(null)}>
                      Change Place
                    </Button>
                    {attractionData.address && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(attractionData.address)}`, '_blank')}
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        Directions
                      </Button>
                    )}
                    {attractionData.website && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(attractionData.website, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Website
                      </Button>
                    )}
                    {attractionData.phone && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(`tel:${attractionData.phone}`, '_self')}
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Search for attractions, museums, landmarks, and places to visit.
                </p>
                <AttractionsSearch value={attractionData} onChange={handleAttractionSelect} location={itineraryLocation} placeholder="Search Louvre, Eiffel Tower, Central Park..." />
              </div>
            )}
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add any other type of event or reminder.
            </p>
            
            {/* Location Field with Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="event-location">Location (Optional)</Label>
              <div className="relative">
                <Input
                  id="event-location"
                  value={location}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  placeholder="Enter address or location..."
                  className="w-full"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-[9999] max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleLocationSelect(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground first:rounded-t-md last:rounded-b-md"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {suggestion.name || suggestion.formatted_address}
                            </div>
                            {suggestion.name && suggestion.formatted_address && (
                              <div className="text-xs text-muted-foreground truncate">
                                {suggestion.formatted_address}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Event Title *</Label>
        <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter event title..." className="w-full" />
      </div>

      {/* Time */}
      <div className="space-y-2">
        <Label>Time *</Label>
        <Popover open={isTimePickerOpen} onOpenChange={setIsTimePickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !time && "text-muted-foreground")} onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsTimePickerOpen(!isTimePickerOpen);
            }}>
              <Clock className="mr-2 h-4 w-4" />
              {time ? time : <span>Select time</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background border shadow-lg" align="start" side="bottom" sideOffset={4} style={{
            zIndex: 9999
          }}>
            <div className="p-4 space-y-4">
              {/* All Day toggle */}
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={isAllDay} 
                    onCheckedChange={(checked) => {
                      setIsAllDay(checked);
                      if (checked) {
                        setTime('All day');
                        setIsTimePickerOpen(false);
                      } else {
                        setTime('');
                      }
                    }} 
                  />
                  <Label className="text-sm">All day</Label>
                </div>
              </div>

              {/* Time picker - only show when not all day */}
              {!isAllDay && (
                <>
                  {/* 24-hour toggle */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">12h</span>
                      <Switch checked={is24Hour} onCheckedChange={checked => {
                        setIs24Hour(checked);
                        if (checked) {
                          // Convert 12-hour to 24-hour
                          let hour24 = parseInt(selectedHour);
                          if (selectedPeriod === 'PM' && hour24 !== 12) {
                            hour24 += 12;
                          } else if (selectedPeriod === 'AM' && hour24 === 12) {
                            hour24 = 0;
                          }
                          setSelectedHour(hour24.toString().padStart(2, '0'));
                        } else {
                          // Convert 24-hour to 12-hour
                          let hour12 = parseInt(selectedHour);
                          const period = hour12 >= 12 ? 'PM' : 'AM';
                          if (hour12 === 0) hour12 = 12;else if (hour12 > 12) hour12 -= 12;
                          setSelectedHour(hour12.toString().padStart(2, '0'));
                          setSelectedPeriod(period);
                        }
                      }} />
                      <span className="text-xs">24h</span>
                    </div>
                   </div>

                   <div className="flex items-center space-x-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Hour</Label>
                      <Select value={selectedHour} onValueChange={setSelectedHour}>
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {is24Hour ?
                          // 24-hour format: 00-23
                          Array.from({
                            length: 24
                          }, (_, i) => <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                  {i.toString().padStart(2, '0')}
                                </SelectItem>) :
                          // 12-hour format: 01-12
                          Array.from({
                            length: 12
                          }, (_, i) => {
                            const hour = i + 1;
                            return <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                                    {hour.toString().padStart(2, '0')}
                                  </SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="text-xl font-bold">:</div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Minute</Label>
                      <Select value={selectedMinute} onValueChange={setSelectedMinute}>
                        <SelectTrigger className="w-16">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['00', '15', '30', '45'].map(minute => <SelectItem key={minute} value={minute}>
                              {minute}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {!is24Hour && <div className="space-y-1">
                        <Label className="text-xs">Period</Label>
                        <Select value={selectedPeriod} onValueChange={(value: 'AM' | 'PM') => setSelectedPeriod(value)}>
                          <SelectTrigger className="w-16">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>}
                  </div>
                  
                  <div className="flex justify-between pt-2 border-t">
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      setTime('');
                      setSelectedHour(is24Hour ? '12' : '12');
                      setSelectedMinute('00');
                      if (!is24Hour) setSelectedPeriod('PM');
                      setIsTimePickerOpen(false);
                    }} className="text-muted-foreground hover:text-foreground">
                      Clear
                    </Button>
                    <Button type="button" size="sm" onClick={() => {
                      const timeString = is24Hour ? `${selectedHour}:${selectedMinute}` : `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
                      setTime(timeString);
                      setIsTimePickerOpen(false);
                    }}>
                      Set Time
                    </Button>
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Date Selection for Multi-Day Events */}
      {isMultiDayEvent && availableDates.length > 0 && (
        <div className="space-y-3">
          <Label>Select Days for Event *</Label>
          <p className="text-sm text-muted-foreground">
            Choose which day(s) you want to add this event to
          </p>
          <div className="grid gap-2 max-h-32 overflow-y-auto">
            {availableDates.map((date, index) => {
              const formattedDate = isDayMode 
                ? date.startsWith('day-') ? `Day ${date.split('-')[1]}` : `Day ${index + 1}`
                : format(new Date(date), 'EEEE, MMMM do');
              const isSelected = selectedDates.includes(date);
              return (
                <div key={date} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`date-${date}`}
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDates(prev => [...prev, date]);
                      } else {
                        setSelectedDates(prev => prev.filter(d => d !== date));
                      }
                    }}
                    className="rounded border-border"
                  />
                  <Label htmlFor={`date-${date}`} className="text-sm cursor-pointer">
                    {formattedDate}
                  </Label>
                </div>
              );
            })}
          </div>
          {selectedDates.length > 0 && (
            <p className="text-xs text-primary">
              Selected {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add notes or additional details..." rows={3} />
      </div>

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price">Price (optional)</Label>
        <Input 
          id="price" 
          value={price} 
          onChange={e => {
            const value = e.target.value;
            // Remove non-numeric characters except decimal point
            const numericValue = value.replace(/[^0-9.]/g, '');
            // Format with dollar sign if there's a numeric value
            if (numericValue) {
              setPrice(`$${numericValue}`);
            } else {
              setPrice('');
            }
          }} 
          placeholder="Enter amount..." 
          className="w-full" 
        />
      </div>

      {/* Custom Links */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-medium">Custom Links</Label>
        <div className="space-y-3">
          {/* Add new link input */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                value={newLinkInput}
                onChange={(e) => setNewLinkInput(e.target.value)}
                placeholder="Add a link (e.g., https://example.com or example.com)"
                className={cn(
                  "bg-background border-border/30 pr-20",
                  newLinkInput && isValidUrl(newLinkInput) && "border-green-500 dark:border-green-400",
                  newLinkInput && !isValidUrl(newLinkInput) && newLinkInput.trim() && "border-red-500 dark:border-red-400"
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmedLink = newLinkInput.trim();
                    if (trimmedLink && isValidUrl(trimmedLink)) {
                      setCustomLinks([...customLinks, trimmedLink]);
                      setNewLinkInput('');
                    } else if (trimmedLink) {
                      toast.error('Please enter a valid URL');
                    }
                  }
                }}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {newLinkInput && (
                  <div className="flex items-center">
                    {isValidUrl(newLinkInput) ? (
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    ) : newLinkInput.trim() ? (
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    ) : null}
                  </div>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const trimmedLink = newLinkInput.trim();
                    if (trimmedLink && isValidUrl(trimmedLink)) {
                      setCustomLinks([...customLinks, trimmedLink]);
                      setNewLinkInput('');
                    } else if (trimmedLink) {
                      toast.error('Please enter a valid URL');
                    }
                  }}
                  disabled={!newLinkInput.trim() || !isValidUrl(newLinkInput)}
                  className="h-7 px-3 text-xs"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Display existing links */}
          {customLinks.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Added Links ({customLinks.length})</Label>
              {customLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg border border-border/20">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span className="text-sm text-foreground flex-1 truncate">{link}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomLinks(customLinks.filter((_, i) => i !== index));
                    }}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {customLinks.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No links added yet. Add links to tickets, reservations, websites, etc.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DrawerTitle>
            {formattedDate && (
              <DrawerDescription>{`Adding event for ${formattedDate}`}</DrawerDescription>
            )}
          </DrawerHeader>
          <div className="px-4 pb-4 h-[65vh] overflow-y-auto">
            {formContent}
          </div>
          <DrawerFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!title.trim() || !time || (isMultiDayEvent && selectedDates.length === 0)}
            >
              {editingEvent ? 'Update Event' : 'Add Event'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] h-[75vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
          <DialogDescription>
            {formattedDate && `Adding event for ${formattedDate}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {formContent}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || !time || (isMultiDayEvent && selectedDates.length === 0)}
          >
            {editingEvent ? 'Update Event' : 'Add Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}