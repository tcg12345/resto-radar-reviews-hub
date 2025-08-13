import { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';

interface OpeningHoursDisplayProps {
  hours: string[];
  className?: string;
}

export function OpeningHoursDisplay({ hours, className = "" }: OpeningHoursDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hours || hours.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 py-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">Hours not available</span>
        </div>
      </div>
    );
  }

  // Get current day
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  const dayMap: { [key: string]: string } = {
    'sun': 'Sunday',
    'mon': 'Monday', 
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday'
  };

  // Parse and format the hours
  const formatHours = (hourString: string) => {
    const timeMatch = hourString.match(/:\s*(.+)/);
    if (timeMatch) {
      return timeMatch[1].trim();
    }
    return hourString;
  };

  const getDayName = (hourString: string) => {
    const dayMatch = hourString.match(/^([A-Za-z]+)/);
    return dayMatch ? dayMatch[1] : '';
  };

  // Find today's hours
  const todayHours = hours.find(hour => {
    const day = getDayName(hour).toLowerCase();
    return day.startsWith(currentDay);
  });

  const todayTime = todayHours ? formatHours(todayHours) : 'Closed';
  const isOpen = todayTime !== 'Closed' && !todayTime.toLowerCase().includes('closed');

  return (
    <div className={`${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between py-3 hover:bg-muted/30 transition-colors rounded-md"
      >
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{todayTime}</span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="pl-8 pb-3">
          <div className="space-y-2 bg-muted/20 rounded-md p-3">
            {hours.map((hour, index) => {
              const day = getDayName(hour);
              const time = formatHours(hour);
              const isToday = day.toLowerCase().startsWith(currentDay);
              
              return (
                <div key={index} className={`flex justify-between items-center text-sm ${isToday ? 'font-medium' : ''}`}>
                  <span className={`min-w-20 ${isToday ? 'text-primary' : 'text-foreground'}`}>{day}</span>
                  <span className={`text-right ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}