import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function RestaurantDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-3 space-y-4">
            <div className="animate-fade-in">
              <Skeleton className="h-12 w-3/4 mb-3" />
              
              {/* Rating Bar */}
              <div className="flex items-center gap-4 mb-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-32" />
                </div>
                <Skeleton className="h-6 w-16 ml-auto" />
              </div>
              
              {/* Quick Info Tags */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
              </div>

              {/* Address */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 mt-0.5" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Photos Section */}
            <Card className="overflow-hidden animate-fade-in">
              <CardContent className="p-0">
                <Skeleton className="h-96 lg:h-[500px] w-full" />
              </CardContent>
            </Card>
          </div>

          {/* Action Panel */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in">
            <Skeleton className="h-12 w-full rounded-lg" />

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>

            {/* Restaurant Stats */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opening Hours */}
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-28 mb-3" />
                <div className="space-y-2">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}