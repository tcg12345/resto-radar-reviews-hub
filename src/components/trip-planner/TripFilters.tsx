import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Star, X } from 'lucide-react';

export function TripFilters() {
  return (
    <Card className="border-2 border-dashed border-muted-foreground/25">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Star className="w-4 h-4" />
          Advanced Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          More filtering options coming soon! Currently you can filter by status and search by name/destination.
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Date range filter
          </Badge>
          <Badge variant="outline" className="text-xs">
            Rating filter
          </Badge>
          <Badge variant="outline" className="text-xs">
            Place count filter
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}