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
  return <div className="w-full px-4 lg:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Trip Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your adventures and discover new places
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
            <Plus className="w-4 h-4" />
            New Trip
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <TripStats trips={trips} />

      {/* Controls */}
      <Card className="border-2 border-primary/10 -mx-4 lg:mx-0 rounded-none lg:rounded-lg">
        <CardContent className="p-3 md:p-4">
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-3">
            {/* Search - Full width on mobile */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search trips..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 h-10" />
            </div>

            {/* Filters Row - Compact on mobile */}
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="flex-1 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode - Compact */}
              <div className="flex items-center border rounded-md">
                <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-9 w-9 p-0">
                  <Grid3X3 className="w-3.5 h-3.5" />
                </Button>
                <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-9 w-9 p-0">
                  <List className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:flex flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search trips by name or destination..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trips</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex items-center border rounded-lg p-1">
              <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="h-8 w-8 p-0">
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="h-8 w-8 p-0">
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {filteredAndSortedTrips.length} {filteredAndSortedTrips.length === 1 ? 'trip' : 'trips'}
              </Badge>
              {searchQuery && <Badge variant="outline">
                  Search: "{searchQuery}"
                </Badge>}
              {selectedStatus !== 'all' && <Badge variant="outline">
                  {selectedStatus}
                </Badge>}
            </div>
            
            {filteredAndSortedTrips.length > 0 && <p className="text-sm text-muted-foreground">
                Sorted by {sortBy === 'recent' ? 'most recent' : sortBy === 'oldest' ? 'oldest first' : sortBy}
              </p>}
          </div>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && <TripFilters />}

      {/* Trip Content */}
      {filteredAndSortedTrips.length === 0 ? <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Map className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {trips.length === 0 ? 'Start Your Journey' : 'No trips found'}
            </h3>
            <p className="text-muted-foreground mb-6 w-full max-w-none">
              {trips.length === 0 ? 'Create your first trip to begin collecting memories and rating amazing places!' : 'Try adjusting your search or filters to find what you\'re looking for.'}
            </p>
            {trips.length === 0 && <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gradient-to-r from-primary to-primary/80">
                <Plus className="w-4 h-4 mr-2" />
                Create First Trip
              </Button>}
          </CardContent>
        </Card> : <>
          {viewMode === 'grid' ? <TripGrid trips={filteredAndSortedTrips} /> : <TripList trips={filteredAndSortedTrips} />}
        </>}

      {/* Create Trip Dialog */}
      <CreateTripDialog isOpen={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
    </div>;
}