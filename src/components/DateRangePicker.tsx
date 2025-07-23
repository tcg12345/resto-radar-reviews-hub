import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
}

export function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;

    if (!startDate || (startDate && endDate)) {
      // First date selection or reset
      onDateRangeChange(selectedDate, null);
    } else if (startDate && !endDate) {
      // Second date selection
      if (selectedDate < startDate) {
        // If second date is before first, swap them
        onDateRangeChange(selectedDate, startDate);
      } else {
        onDateRangeChange(startDate, selectedDate);
      }
      setIsOpen(false);
    }
  };

  const displayText = () => {
    if (startDate && endDate) {
      return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`;
    } else if (startDate) {
      return `${format(startDate, 'MMM dd')} - Select end date`;
    } else {
      return 'Select travel dates';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !startDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={startDate || undefined}
          onSelect={handleSelect}
          initialFocus
          className="pointer-events-auto"
          disabled={(date) => date < new Date()}
        />
        {startDate && !endDate && (
          <div className="p-3 border-t text-sm text-muted-foreground">
            Select your end date
          </div>
        )}
        {startDate && endDate && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDateRangeChange(null, null);
                setIsOpen(false);
              }}
              className="w-full"
            >
              Clear dates
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}