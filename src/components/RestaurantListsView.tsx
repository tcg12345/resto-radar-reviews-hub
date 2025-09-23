import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download } from 'lucide-react';
import { useRestaurantLists, RestaurantList } from '@/hooks/useRestaurantLists';
import { RestaurantListCard } from '@/components/RestaurantListCard';
import { CreateListDialog } from '@/components/CreateListDialog';
import { ImportFromItineraryDialog } from '@/components/ImportFromItineraryDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RestaurantListsViewProps {
  onSelectList: (list: RestaurantList) => void;
}

export function RestaurantListsView({ onSelectList }: RestaurantListsViewProps) {
  const { lists, loading, createList, deleteList, refreshLists } = useRestaurantLists();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedListForImport, setSelectedListForImport] = useState<RestaurantList | null>(null);
  const { toast } = useToast();

  // Refresh lists when component mounts to ensure instant loading
  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  const filteredLists = lists.filter(list =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (list.description && list.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleImportFromItinerary = (list: RestaurantList) => {
    setSelectedListForImport(list);
    setShowImportDialog(true);
  };

  const handleImportRestaurants = async (restaurants: any[]) => {
    if (!selectedListForImport) return;

    try {
      // First, insert the restaurants
      const { data: insertedRestaurants, error: insertError } = await supabase
        .from('restaurants')
        .insert(restaurants)
        .select();

      if (insertError) throw insertError;

      // Then add them to the selected list
      if (insertedRestaurants) {
        const listItems = insertedRestaurants.map(restaurant => ({
          restaurant_id: restaurant.id,
          list_id: selectedListForImport.id
        }));

        const { error: listError } = await supabase
          .from('restaurant_list_items')
          .insert(listItems);

        if (listError) throw listError;
      }

      toast({
        title: 'Import Successful',
        description: `Imported ${restaurants.length} restaurants to ${selectedListForImport.name}`,
      });

    } catch (error: any) {
      console.error('Error importing restaurants:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Failed to import restaurants from itinerary',
      });
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Restaurant Lists</h2>
          <p className="text-muted-foreground">
            Organize your restaurants into custom lists
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create List
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lists Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {searchQuery ? 'No lists found' : 'No lists yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Create your first list to organize your restaurants'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First List
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredLists.map(list => (
            <div key={list.id} className="relative group">
              <RestaurantListCard
                list={list}
                onSelect={onSelectList}
                onDelete={list.is_default ? undefined : deleteList}
              />
              {/* Import button for non-default lists */}
              {!list.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImportFromItinerary(list);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create List Dialog */}
      <CreateListDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreateList={createList}
      />

      {/* Import from Itinerary Dialog */}
      <ImportFromItineraryDialog
        isOpen={showImportDialog}
        onClose={() => {
          setShowImportDialog(false);
          setSelectedListForImport(null);
        }}
        onImport={handleImportRestaurants}
        listName={selectedListForImport?.name || ''}
      />
    </div>
  );
}