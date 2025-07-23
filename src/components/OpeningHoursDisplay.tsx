import { Clock } from 'lucide-react';

interface OpeningHoursDisplayProps {
  hours: string[];
  className?: string;
}

export function OpeningHoursDisplay({ hours, className = "" }: OpeningHoursDisplayProps) {
  if (!hours || hours.length === 0) {
    return (
      <div className={className}>
        <h4 className="font-semibold mb-2 flex items-center">
          <Clock className="mr-1 h-4 w-4" />
          Opening Hours
        </h4>
        <p className="text-sm text-muted-foreground">Hours not available</p>
      </div>
    );
  }

  // Parse and format the hours
  const formatHours = (hourString: string) => {
    // Remove day name and clean up the time format
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

  return (
    <div className={className}>
      <div className="space-y-2">
        {hours.map((hour, index) => {
          const day = getDayName(hour);
          const time = formatHours(hour);
          
          return (
            <div key={index}>
              <div className="flex justify-between items-center text-sm py-2">
                <span className="font-medium min-w-20">{day}</span>
                <span className="text-muted-foreground text-right">{time}</span>
              </div>
              {index < hours.length - 1 && (
                <div className="border-b border-border/50"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}