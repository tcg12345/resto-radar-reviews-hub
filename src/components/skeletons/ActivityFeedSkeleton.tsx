import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Friend avatar */}
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              
              <div className="flex-1 space-y-3">
                {/* Activity header */}
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-8" />
                </div>
                
                {/* Restaurant info */}
                <div className="flex gap-3">
                  <Skeleton className="h-16 w-16 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Skeleton key={j} className="h-3 w-3 rounded-full" />
                        ))}
                      </div>
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                
                {/* Notes or review */}
                {Math.random() > 0.5 && (
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}