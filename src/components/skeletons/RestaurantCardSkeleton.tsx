import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';

export function RestaurantCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-card shadow-md">
      {/* Photo skeleton */}
      <Skeleton className="aspect-video w-full" />
      
      <CardHeader className="pb-2">
        <div className="space-y-2">
          {/* Restaurant name */}
          <Skeleton className="h-6 w-3/4" />
          
          {/* Rating and stars */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-4 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          
          {/* Price and cuisine */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-2">
          {/* Hours */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-3.5 w-3.5" />
            <Skeleton className="h-4 w-24" />
          </div>
          
          {/* Date visited badge */}
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-0 pb-3">
        <Skeleton className="h-7 flex-1" />
        <Skeleton className="h-7 w-8" />
        <Skeleton className="h-7 w-8" />
      </CardFooter>
    </Card>
  );
}