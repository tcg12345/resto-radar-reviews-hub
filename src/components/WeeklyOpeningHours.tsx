import { Clock } from 'lucide-react';

interface WeeklyOpeningHoursProps {
  openingHours: string;
}

export function WeeklyOpeningHours({ openingHours }: WeeklyOpeningHoursProps) {
  console.log('WeeklyOpeningHours received openingHours:', openingHours);
  console.log('WeeklyOpeningHours openingHours type:', typeof openingHours);
  // Parse opening hours string into structured format
  const parseOpeningHours = (hoursText: string) => {
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const lines = hoursText.split('\n').filter(line => line.trim());
    
    const parsedHours = daysOfWeek.map(day => {
      const dayLine = lines.find(line => 
        line.toLowerCase().includes(day.toLowerCase()) || 
        line.toLowerCase().includes(day.slice(0, 3).toLowerCase())
      );
      
      if (dayLine) {
        // Extract time from the line (e.g., "Monday: 9:00 AM - 10:00 PM")
        const timeMatch = dayLine.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)|closed|open 24 hours/i);
        return {
          day,
          hours: timeMatch ? timeMatch[0] : 'Hours not available'
        };
      }
      
      return { day, hours: 'Hours not available' };
    });
    
    return parsedHours;
  };

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const hoursData = parseOpeningHours(openingHours);
  const currentDay = getCurrentDay();

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {hoursData.map(({ day, hours }) => (
          <div
            key={day}
            className={`flex justify-between items-center py-1 px-2 rounded text-sm ${
              day === currentDay ? 'bg-primary/10 font-medium' : ''
            }`}
          >
            <span className={day === currentDay ? 'font-semibold' : ''}>{day}</span>
            <span className={`${
              hours.toLowerCase().includes('closed') ? 'text-destructive' : 'text-muted-foreground'
            } ${day === currentDay ? 'font-semibold' : ''}`}>
              {hours}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}