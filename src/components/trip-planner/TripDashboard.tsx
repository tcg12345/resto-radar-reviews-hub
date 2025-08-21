import { useState } from 'react';
import { Plus, Search, Filter, SortDesc, Grid3X3, List, Map, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useTrips } from '@/hooks/useTrips';
import { TripGrid } from './TripGrid';
import { TripList } from './TripList';
import { TripStats } from './TripStats';
import { CreateTripDialog } from './CreateTripDialog';
import { TripFilters } from './TripFilters';
type ViewMode = 'grid' | 'list';
type SortBy = 'recent' | 'oldest' | 'name' | 'rating' | 'places';
export function TripDashboard() {
  const {
    trips,
    loading
  } = useTrips();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'upcoming' | 'completed' | 'in-progress'>('all');
  const filteredAndSortedTrips = trips.filter(trip => {
    const matchesSearch = trip.title.toLowerCase().includes(searchQuery.toLowerCase()) || trip.destination.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedStatus === 'all') return matchesSearch;
    const now = new Date();
    const startDate = trip.start_date ? new Date(trip.start_date) : null;
    const endDate = trip.end_date ? new Date(trip.end_date) : null;
    switch (selectedStatus) {
      case 'upcoming':
        return matchesSearch && startDate && startDate > now;
      case 'completed':
        return matchesSearch && endDate && endDate < now;
      case 'in-progress':
        return matchesSearch && startDate && endDate && startDate <= now && endDate >= now;
      default:
        return matchesSearch;
    }
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'name':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
  });
  if (loading) {
    return <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your trips...</p>
        </div>
      </div>;
  }
  return <div className="w-full space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="px-3 lg:px-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
          <div className="text-center lg:text-left">
            <h1 className="text-2xl lg:text-4xl font-bold text-gradient mb-2">
              My Trips
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              Manage your adventures and discover amazing places
            </p>
          </div>
          
          <div className="flex justify-center lg:justify-end">
            <Button 
              onClick={() => setIsCreateDialogOpen(true)} 
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-gradient-premium hover:shadow-premium-glow transition-all duration-300 shadow-lg"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              <span>New Trip</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <TripStats trips={trips} />

      {/* Premium Controls */}
      <div className="mx-3 lg:mx-0">
        <Card className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl shadow-premium">
          <CardContent className="p-4 lg:p-6">
            {/* Mobile Layout */}
            <div className="lg:hidden space-y-4">
              {/* Search - Full width on mobile */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search trips..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-12 h-12 rounded-xl bg-muted/30 border-0 text-base font-medium placeholder:text-muted-foreground/70 focus:bg-background/80 transition-all duration-300" 
                />
              </div>

              {/* Filters Row - Enhanced mobile layout */}
              <div className="flex gap-3">
                <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                  <SelectTrigger className="flex-1 h-11 text-sm rounded-xl bg-muted/30 border-0 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="in-progress">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                  <SelectTrigger className="flex-1 h-11 text-sm rounded-xl bg-muted/30 border-0 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="recent">Recent</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>

                {/* Enhanced View Mode Toggle */}
                <div className="flex items-center bg-muted/30 rounded-xl p-1">
                  <Button 
                    variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('grid')} 
                    className="h-9 w-9 p-0 rounded-lg"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant={viewMode === 'list' ? 'default' : 'ghost'} 
                    size="sm" 
                    onClick={() => setViewMode('list')} 
                    className="h-9 w-9 p-0 rounded-lg"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Premium Desktop Layout */}
            <div className="hidden lg:flex flex-row gap-4">
              {/* Enhanced Search */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  placeholder="Search trips by name or destination..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="pl-12 h-12 rounded-xl bg-muted/30 border-0 text-base font-medium placeholder:text-muted-foreground/70 focus:bg-background/80 transition-all duration-300 focus:shadow-lg" 
                />
              </div>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger className="w-[160px] h-12 rounded-xl bg-muted/30 border-0 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="all">All Trips</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="w-[140px] h-12 rounded-xl bg-muted/30 border-0 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>

              {/* Premium View Mode Toggle */}
              <div className="flex items-center bg-muted/30 rounded-xl p-1.5">
                <Button 
                  variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('grid')} 
                  className="h-9 w-10 p-0 rounded-lg transition-all duration-300"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'default' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('list')} 
                  className="h-9 w-10 p-0 rounded-lg transition-all duration-300"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Enhanced Results Summary */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 rounded-lg px-3 py-1 font-medium">
                  {filteredAndSortedTrips.length} {filteredAndSortedTrips.length === 1 ? 'trip' : 'trips'}
                </Badge>
                {searchQuery && <Badge variant="outline" className="rounded-lg px-3 py-1 border-border/50">
                    Search: "{searchQuery}"
                  </Badge>}
                {selectedStatus !== 'all' && <Badge variant="outline" className="rounded-lg px-3 py-1 border-border/50 capitalize">
                    {selectedStatus}
                  </Badge>}
              </div>
              
              {filteredAndSortedTrips.length > 0 && <p className="text-sm text-muted-foreground font-medium">
                  Sorted by {sortBy === 'recent' ? 'most recent' : sortBy === 'oldest' ? 'oldest first' : sortBy}
                </p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && <TripFilters />}

      {/* Premium Trip Content */}
      <div className="mx-3 lg:mx-0">
        {filteredAndSortedTrips.length === 0 ? (
          <Card className="border-dashed border-2 border-border/30 rounded-2xl bg-gradient-subtle">
            <CardContent className="p-8 lg:p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-primary/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                <Map className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl lg:text-2xl font-bold mb-3 text-gradient">
                {trips.length === 0 ? 'Start Your Journey' : 'No trips found'}
              </h3>
              <p className="text-muted-foreground mb-8 text-base lg:text-lg max-w-md mx-auto">
                {trips.length === 0 
                  ? 'Create your first trip to begin collecting memories and rating amazing places!' 
                  : 'Try adjusting your search or filters to find what you\'re looking for.'
                }
              </p>
              {trips.length === 0 && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)} 
                  className="px-8 py-3 rounded-xl font-medium bg-gradient-premium hover:shadow-premium-glow transition-all duration-300 shadow-lg"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Trip
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="animate-fade-in-up">
            {viewMode === 'grid' ? (
              <TripGrid trips={filteredAndSortedTrips} />
            ) : (
              <TripList trips={filteredAndSortedTrips} />
            )}
          </div>
        )}
      </div>

      {/* Create Trip Dialog */}
      <CreateTripDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
    </div>;
}