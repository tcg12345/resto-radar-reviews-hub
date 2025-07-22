import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function FriendProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-8 w-8 mx-auto mb-2" />
              <Skeleton className="h-6 w-8 mx-auto mb-1" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restaurants grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-3 w-3 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}