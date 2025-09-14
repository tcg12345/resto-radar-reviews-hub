// src/pages/RatedRestaurantsPage.tsx
//
// Full, expanded rewrite with bug fixes and a cleaned-up header.
//
// ✅ Fixes included:
// 1) Lists never load: ensured loading state resolves (finally) and added defensive guards.
// 2) Add flow enforces ONE list selection (in addition to the implicit "All" view).
//    - We normalize the payload on save so only one listId is honored.
//    - No multi-select: if RestaurantDialog still returns multiple listIds, we coerce to one (the selectedListId or the first returned).
// 3) Prevents duplicate adds to "All": on this page we call the add handler exactly once and we also dedupe local caches on hydrate.
// 4) When adding to a non-"All" list, we scope the page view to that specific list (so downstream reorder UIs—if any—operate on the right list).
// 5) Full functionality preserved: searching, filtering (cuisine/price/Michelin/rating), sorting, mobile/desktop toolbars, list previews.
// 6) Header fully redesigned for a tighter, cleaner look, no awkward blank space.
//
// ⚠️ Notes / Integration assumptions:
// - This page does not implement the reorder UI itself. We set the selected list to the one the user added to,
//   so if your app shows a reorder page or dialog next, it will have the correct list context.
// - If your <RestaurantDialog /> already implements list selection, pass-through props below help enforce single selection.
//   If not, we still enforce single list in the payload we send to onAddRestaurant.
// - The "All" list is treated as the base set of rated restaurants (non-wishlist), not a real list ID.
//   We never try to attach a listId for "All".
//
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, ChevronDown, X, Sliders, MapPin, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardList } from '@/components/RestaurantCardList';
import { ViewToggle, useViewToggle } from '@/components/ViewToggle';
import { RestaurantDialog } from '@/components/Dialog/RestaurantDialog';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { RatedRestaurantsFilterDialog } from '@/components/RatedRestaurantsFilterDialog';
import { CreateListDialog } from '@/components/CreateListDialog';

import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { resolveImageUrl } from '@/utils/imageUtils';
import { useRestaurantLists } from '@/hooks/useRestaurantLists';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface RatedRestaurantsPageProps {
  restaurants: Restaurant[];
  onAddRestaurant: (data: RestaurantFormData) => void | Promise<void>;
  onEditRestaurant: (id: string, data: RestaurantFormData) => void | Promise<void>;
  onDeleteRestaurant: (id: string) => void | Promise<void>;
  shouldOpenAddDialog?: boolean;
  onAddDialogClose?: () => void;
  onNavigateToMap?: () => void;
  onOpenSettings?: () => void; // (not used here, kept for parity)
  onBackToLists?: () => void; // (not used here, kept for parity)
}

// -----------------------------------------------------------------------------
// Constants / Helpers
// -----------------------------------------------------------------------------

/**
 * Normalize a listId selection to a SINGLE list id.
 * 1) If a page-level selectedListId exists, that wins.
 * 2) Else, if the dialog sends back a listIds array, take the first.
 * 3) Else, null (which maps to "All" view).
 */
function pickSingleListId(
  pageSelectedListId: string | null,
  dialogListIds?: string[] | null
): string | null {
  if (pageSelectedListId) return pageSelectedListId;
  if (dialogListIds && dialogListIds.length > 0) return dialogListIds[0] || null;
  return null;
}

/**
 * Returns a currency string for a price range value (1..4).
 */
function priceToSymbol(price?: number | null): string {
  if (!price) return '';
  if (price === 1) return '$';
  if (price === 2) return '$$';
  if (price === 3) return '$$$';
  return '$$$$';
}

/**
 * Defensive unique-by-id dedupe for Restaurant arrays.
 */
function dedupeById(items: Restaurant[]): Restaurant[] {
  const seen = new Set<string>();
  const out: Restaurant[] = [];
  for (const r of items) {
    if (!r?.id) continue;
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}

/**
 * Simple safe date getter.
 */
function getTime(d?: string | Date | null): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return isNaN(t) ? 0 : t;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function RatedRestaurantsPage({
  restaurants,
  onAddRestaurant,
  onEditRestaurant,
  onDeleteRestaurant,
  shouldOpenAddDialog = false,
  onAddDialogClose,
  onNavigateToMap,
}: RatedRestaurantsPageProps) {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  // Lists (from custom hook) + local cache for instant paint
  const { lists, createList, getRestaurantsInList } = useRestaurantLists();

  // The currently active list tab on this page (null = "All")
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Cached lists for instant first paint
  const [cachedLists, setCachedLists] = useState<any[]>([]);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // CRUD selections
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | undefined>(undefined);

  // Search + sort + filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<
    | 'latest'
    | 'oldest'
    | 'rating-high'
    | 'rating-low'
    | 'name-az'
    | 'name-za'
    | 'price-low'
    | 'price-high'
    | 'michelin-high'
    | 'michelin-low'
  >('rating-high');

  const [filterCuisines, setFilterCuisines] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [filterMichelins, setFilterMichelins] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [tempRatingRange, setTempRatingRange] = useState<[number, number]>([0, 10]);

  // Grid/list view toggle
  const { view, setView } = useViewToggle('rated-restaurants-view', 'grid');

  // Mobile filters
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Photo prefetch sentinel
  const photosLoadedRef = useRef(false);

  // Cached restaurants for instant paint
  const [cachedRestaurants, setCachedRestaurants] = useState<Restaurant[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Restaurants in the currently selected list (if any)
  const [listRestaurants, setListRestaurants] = useState<Restaurant[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);

  // Create-list dialog
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);

  // Track last list used during add flow (helps us ensure the UI scopes to that list)
  const lastUsedListIdRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived - Source restaurants (base "All" view = non-wishlist)
  // ---------------------------------------------------------------------------

  const sourceRestaurants: Restaurant[] = useMemo(() => {
    // Use server/state restaurants if present; otherwise fallback to cached
    const src = restaurants.length > 0 ? restaurants : cachedRestaurants;
    // Defensive dedupe
    return dedupeById(src);
  }, [restaurants, cachedRestaurants]);

  const ratedRestaurants: Restaurant[] = useMemo(
    () => sourceRestaurants.filter((r) => !r?.isWishlist),
    [sourceRestaurants]
  );

  // ---------------------------------------------------------------------------
  // Effects: initial open, hydration, caches, lists loading
  // ---------------------------------------------------------------------------

  // If HomePage triggers add flow, open add dialog once
  useEffect(() => {
    if (shouldOpenAddDialog) {
      setIsAddDialogOpen(true);
      onAddDialogClose?.();
    }
  }, [shouldOpenAddDialog, onAddDialogClose]);

  // Hydrate restaurants cache for instant render
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ratedRestaurantsCache');
      if (raw) {
        const parsed: Restaurant[] = JSON.parse(raw);
        setCachedRestaurants(dedupeById(parsed));
      }
    } catch {
      console.warn('Failed to load ratedRestaurantsCache');
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist restaurants cache when live data arrives
  useEffect(() => {
    if (restaurants.length > 0 && ratedRestaurants.length > 0) {
      try {
        localStorage.setItem('ratedRestaurantsCache', JSON.stringify(dedupeById(ratedRestaurants)));
      } catch {
        // ignore quota errors
      }
    }
  }, [restaurants.length, ratedRestaurants]);

  // Hydrate lists cache for instant render
  useEffect(() => {
    try {
      const raw = localStorage.getItem('restaurantListsCache');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCachedLists(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      console.warn('Failed to load restaurantListsCache');
    }
  }, []);

  // Persist lists cache when live lists arrive
  useEffect(() => {
    if (lists.length > 0) {
      try {
        localStorage.setItem('restaurantListsCache', JSON.stringify(lists));
      } catch {
        // ignore
      }
    }
  }, [lists]);

  // We use cached lists until live lists arrive
  const displayLists: Array<{ id: string; name: string; [k: string]: any }> =
    lists.length > 0 ? lists : cachedLists;

  // Load restaurants for the selected list
  const refreshSelectedList = useCallback(() => {
    if (!selectedListId) {
      setListRestaurants([]);
      setIsListLoading(false);
      return;
    }
    setIsListLoading(true);
    getRestaurantsInList(selectedListId)
      .then((rows) => {
        const safe = Array.isArray(rows) ? rows : [];
        setListRestaurants(dedupeById(safe));
      })
      .catch(() => {
        setListRestaurants([]);
      })
      .finally(() => {
        setIsListLoading(false);
      });
  }, [selectedListId, getRestaurantsInList]);

  useEffect(() => {
    // When the selected list changes, load its contents
    if (selectedListId) {
      refreshSelectedList();
    } else {
      setListRestaurants([]);
      setIsListLoading(false);
    }
  }, [selectedListId, refreshSelectedList]);

  // Prefetch first few photos for perceived speed
  useEffect(() => {
    if (ratedRestaurants.length > 0 && !photosLoadedRef.current) {
      photosLoadedRef.current = true;

      const subset = ratedRestaurants
        .filter((r) => r?.photos && r.photos.length > 0)
        .slice(0, 10);

      subset.forEach((r) => {
        try {
          const url = resolveImageUrl(r.photos![0], { width: 800 }) as string;
          if (url) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
            const img = new Image();
            img.src = url;
          }
        } catch {
          // never block on errors
        }
      });
    }
  }, [ratedRestaurants.length, ratedRestaurants]);

  // ---------------------------------------------------------------------------
  // Filter helpers
  // ---------------------------------------------------------------------------

  // Unique cuisines list (from all rated restaurants, not just filter result)
  const cuisines: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const r of ratedRestaurants) {
      const c = (r.cuisine || '').trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [ratedRestaurants]);

  const toggleCuisine = (cuisine: string) =>
    setFilterCuisines((prev) => (prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]));

  const togglePrice = (price: string) =>
    setFilterPrices((prev) => (prev.includes(price) ? prev.filter((p) => p !== price) : [...prev, price]));

  const toggleMichelin = (michelin: string) =>
    setFilterMichelins((prev) => (prev.includes(michelin) ? prev.filter((m) => m !== michelin) : [...prev, michelin]));

  const clearFilters = () => {
    setFilterCuisines([]);
    setFilterPrices([]);
    setFilterMichelins([]);
    setRatingRange([0, 10]);
    setTempRatingRange([0, 10]);
  };

  const applyRatingFilter = () => setRatingRange(tempRatingRange);

  // ---------------------------------------------------------------------------
  // Filter counts (dependent on search + rating only, then show counts w/ other toggles)
  // ---------------------------------------------------------------------------

  /**
   * We compute counts for Cuisine / Price / Michelin based on the current
   * search + rating filters so users see relevant counts in popovers.
   * When the user toggles additional filters, the counts naturally reduce.
   */
  const { cuisineCounts, priceCounts, michelinCounts } = useMemo(() => {
    // Base filtered set used to compute counts:
    // - respect current search term
    // - respect rating range
    // other filters are not applied here so the counts remain informative
    const baseFiltered = ratedRestaurants.filter((r) => {
      const s = searchTerm.trim().toLowerCase();
      const matchesSearch =
        s === '' ||
        r.name.toLowerCase().includes(s) ||
        (r.city || '').toLowerCase().includes(s) ||
        (r.cuisine || '').toLowerCase().includes(s);
      const matchesRating = !r.rating || (r.rating >= ratingRange[0] && r.rating <= ratingRange[1]);
      return matchesSearch && matchesRating;
    });

    // Cuisine counts
    const cuisineCounts = cuisines.map((cuisine) => {
      const count = baseFiltered.filter((r) => {
        const cuisineMatch = (r.cuisine || '') === cuisine;

        // If user has price filters or Michelin filters currently toggled,
        // reflect those to keep counts useful
        const priceOk =
          filterPrices.length === 0 || (r.priceRange && filterPrices.includes(String(r.priceRange)));
        const michelinOk =
          filterMichelins.length === 0 || (r.michelinStars && filterMichelins.includes(String(r.michelinStars)));

        return cuisineMatch && priceOk && michelinOk;
      }).length;

      return { cuisine, count };
    });

    // Price counts (1..4)
    const priceValues = ['1', '2', '3', '4'] as const;
    const priceCounts = priceValues.map((price) => {
      const count = baseFiltered.filter((r) => {
        const priceMatch = String(r.priceRange || '') === price;

        const cuisineOk = filterCuisines.length === 0 || filterCuisines.includes(r.cuisine || '');
        const michelinOk =
          filterMichelins.length === 0 || (r.michelinStars && filterMichelins.includes(String(r.michelinStars)));

        return priceMatch && cuisineOk && michelinOk;
      }).length;
      return { price, count };
    });

    // Michelin counts (1..3)
    const michelinValues = ['1', '2', '3'] as const;
    const michelinCounts = michelinValues.map((m) => {
      const count = baseFiltered.filter((r) => {
        const michelinMatch = String(r.michelinStars || '') === m;

        const cuisineOk = filterCuisines.length === 0 || filterCuisines.includes(r.cuisine || '');
        const priceOk =
          filterPrices.length === 0 || (r.priceRange && filterPrices.includes(String(r.priceRange)));

        return michelinMatch && cuisineOk && priceOk;
      }).length;
      return { michelin: m, count };
    });

    return { cuisineCounts, priceCounts, michelinCounts };
  }, [
    ratedRestaurants,
    cuisines,
    searchTerm,
    ratingRange,
    filterCuisines,
    filterPrices,
    filterMichelins,
  ]);

  // ---------------------------------------------------------------------------
  // Display set (list vs all) + Final Filtering + Sorting
  // ---------------------------------------------------------------------------

  const displayRestaurants: Restaurant[] = useMemo(
    () => (selectedListId ? listRestaurants : ratedRestaurants),
    [selectedListId, listRestaurants, ratedRestaurants]
  );

  const filteredRestaurants: Restaurant[] = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();

    // Apply all filters
    const base = displayRestaurants.filter((r) => {
      // Search
      const matchesSearch =
        s === '' ||
        r.name.toLowerCase().includes(s) ||
        (r.city || '').toLowerCase().includes(s) ||
        (r.cuisine || '').toLowerCase().includes(s);

      // Cuisine
      const matchesCuisine = filterCuisines.length === 0 || filterCuisines.includes(r.cuisine || '');

      // Price
      const matchesPrice =
        filterPrices.length === 0 || (r.priceRange && filterPrices.includes(String(r.priceRange)));

      // Michelin
      const matchesMichelin =
        filterMichelins.length === 0 ||
        (r.michelinStars && filterMichelins.includes(String(r.michelinStars)));

      // Rating
      const matchesRating = !r.rating || (r.rating >= ratingRange[0] && r.rating <= ratingRange[1]);

      return matchesSearch && matchesCuisine && matchesPrice && matchesMichelin && matchesRating;
    });

    // Sorting
    const sorted = [...base].sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return getTime(b.updatedAt) - getTime(a.updatedAt);
        case 'oldest':
          return getTime(a.updatedAt) - getTime(b.updatedAt);
        case 'rating-high':
          return (b.rating || 0) - (a.rating || 0);
        case 'rating-low':
          return (a.rating || 0) - (b.rating || 0);
        case 'name-az':
          return a.name.localeCompare(b.name);
        case 'name-za':
          return b.name.localeCompare(a.name);
        case 'price-low':
          return (a.priceRange || 0) - (b.priceRange || 0);
        case 'price-high':
          return (b.priceRange || 0) - (a.priceRange || 0);
        case 'michelin-high':
          return (b.michelinStars || 0) - (a.michelinStars || 0);
        case 'michelin-low':
          return (a.michelinStars || 0) - (b.michelinStars || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }, [
    displayRestaurants,
    searchTerm,
    filterCuisines,
    filterPrices,
    filterMichelins,
    ratingRange,
    sortBy,
  ]);

  // ---------------------------------------------------------------------------
  // Handlers - CRUD
  // ---------------------------------------------------------------------------

  const handleOpenEditDialog = (id: string) => {
    const restaurant = sourceRestaurants.find((r) => r.id === id);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setIsEditDialogOpen(true);
    }
  };

  const handleOpenDeleteDialog = (id: string) => {
    const restaurant = sourceRestaurants.find((r) => r.id === id);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setIsDeleteDialogOpen(true);
    }
  };

  /**
   * Add restaurant handler:
   * - enforce single list selection
   * - after adding to a specific list, switch the page to that list and refresh it
   * - call the upstream add exactly once
   */
  const handleAdd = async (raw: RestaurantFormData) => {
    // Enforce SINGLE list selection in the outgoing payload
    // If page has a selectedListId, that wins; else use first from dialog's data
    const singleListId = pickSingleListId(selectedListId, (raw as any).listIds);

    // Build normalized payload
    const payload: RestaurantFormData & { listIds?: string[] } = {
      ...raw,
      // If your upstream expects "listIds", we coerce to a single-element array or leave empty.
      ...(singleListId ? { listIds: [singleListId] } : { listIds: [] }),
    };

    // Call upstream exactly once
    await Promise.resolve(onAddRestaurant(payload));

    // If we know which list we added to, switch to that list and refresh
    lastUsedListIdRef.current = singleListId;
    if (singleListId) {
      setSelectedListId(singleListId);
      // Important: we refresh the selected list so the newly added restaurant appears
      refreshSelectedList();
    }
  };

  const handleEdit = async (data: RestaurantFormData) => {
    if (!selectedRestaurant) return;
    await Promise.resolve(onEditRestaurant(selectedRestaurant.id, data));
    if (selectedListId) {
      refreshSelectedList();
    }
  };

  const handleDelete = async () => {
    if (!selectedRestaurant) return;
    await Promise.resolve(onDeleteRestaurant(selectedRestaurant.id));
    if (selectedListId) {
      refreshSelectedList();
    }
  };

  // Create list → immediately select it so it’s loaded (prevents "loading forever")
  const handleCreateList = async (name: string, description?: string) => {
    const newList = await createList(name, description);
    if (newList && newList.id) {
      setSelectedListId(newList.id);
    }
  };

  // ---------------------------------------------------------------------------
  // Render Helpers - Header UI / Filters UI
  // ---------------------------------------------------------------------------

  const renderDesktopHeader = () => {
    return (
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-primary">Rated Restaurants</h2>
          <p className="text-sm text-muted-foreground truncate">
            Manage and organize your dining experiences
          </p>
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          <ViewToggle currentView={view} onViewChange={setView} storageKey="rated-restaurants-view" />
          <Button variant="outline" size="sm" onClick={() => setIsCreateListDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New List
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add Restaurant
          </Button>
          {onNavigateToMap && (
            <Button variant="outline" size="sm" onClick={onNavigateToMap}>
              <MapPin className="h-4 w-4" />
              <span className="ml-1">Map</span>
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderMobileToolbar = () => {
    return (
      <div className="sm:hidden space-y-3 mb-6">
        {/* Single Row – View Toggle and Action Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <ViewToggle currentView={view} onViewChange={setView} storageKey="rated-restaurants-view" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsCreateListDialogOpen(true)}
              className="h-8 px-3 text-xs rounded-xl"
            >
              <Plus className="mr-1 h-3 w-3" />
              Create List
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="h-8 px-3 text-xs rounded-xl"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Restaurant
            </Button>
            {onNavigateToMap && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToMap}
                className="h-8 px-3 text-xs rounded-xl"
              >
                <MapPin className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 rounded-xl border border-border bg-background"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(true)}
              className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-muted/50 rounded-lg"
              aria-label="Open Filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderMobileListsPreview = () => {
    return (
      <div className="mb-4 sm:hidden">
        <h3 className="text-lg font-medium mb-2">Your Lists</h3>
        <div className="flex space-x-3 overflow-x-auto py-2">
          <Button
            variant={selectedListId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedListId(null)}
            className="whitespace-nowrap rounded-full px-3 py-1 text-xs"
          >
            All
          </Button>
          {displayLists.map((list) => (
            <Button
              key={list.id}
              variant={selectedListId === list.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedListId(list.id)}
              className="whitespace-nowrap rounded-full px-3 py-1 text-xs"
            >
              {list.name}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  const renderDesktopFilters = () => {
    return (
      <div className="mb-6 hidden sm:flex flex-col items-start gap-4 sm:flex-row sm:items-center w-full">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:ml-auto">
          {/* Clear Filters Button */}
          {(filterCuisines.length > 0 ||
            filterPrices.length > 0 ||
            filterMichelins.length > 0 ||
            ratingRange[0] > 0 ||
            ratingRange[1] < 10) && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="flex-shrink-0">
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}

          {/* Cuisine Filter */}
          <div className="flex-1 min-w-[160px] max-w-[220px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filterCuisines.length === 0
                      ? 'Cuisine'
                      : filterCuisines.length === 1
                      ? filterCuisines[0]
                      : `${filterCuisines.length} cuisines`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0">
                <div className="p-2 max-h-[300px] overflow-auto">
                  <div className="space-y-2">
                    {cuisineCounts.map(({ cuisine, count }) => (
                      <div key={cuisine} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={filterCuisines.includes(cuisine)}
                          onCheckedChange={() => toggleCuisine(cuisine)}
                        />
                        <label htmlFor={`cuisine-${cuisine}`} className="text-sm cursor-pointer flex-1 select-none">
                          <span className="inline-flex items-center gap-2">
                            <span>{cuisine}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Price Filter */}
          <div className="flex-1 min-w-[160px] max-w-[220px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filterPrices.length === 0
                      ? 'Price'
                      : filterPrices.length === 1
                      ? priceToSymbol(Number(filterPrices[0]))
                      : `${filterPrices.length} prices`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0">
                <div className="p-2">
                  <div className="space-y-2">
                    {priceCounts.map(({ price, count }) => (
                      <div key={price} className="flex items-center space-x-2">
                        <Checkbox
                          id={`price-${price}`}
                          checked={filterPrices.includes(price)}
                          onCheckedChange={() => togglePrice(price)}
                        />
                        <label htmlFor={`price-${price}`} className="text-sm cursor-pointer flex-1 select-none">
                          <span className="inline-flex items-center gap-2">
                            <span>{priceToSymbol(Number(price))}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Michelin Filter */}
          <div className="flex-1 min-w-[160px] max-w-[220px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filterMichelins.length === 0
                      ? 'Michelin'
                      : filterMichelins.length === 1
                      ? `${filterMichelins[0]} Star${filterMichelins[0] === '1' ? '' : 's'}`
                      : `${filterMichelins.length} selected`}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[260px] p-0">
                <div className="p-2">
                  <div className="space-y-2">
                    {michelinCounts.map(({ michelin, count }) => (
                      <div key={michelin} className="flex items-center space-x-2">
                        <Checkbox
                          id={`michelin-${michelin}`}
                          checked={filterMichelins.includes(michelin)}
                          onCheckedChange={() => toggleMichelin(michelin)}
                        />
                        <label htmlFor={`michelin-${michelin}`} className="text-sm cursor-pointer flex-1 select-none">
                          <span className="inline-flex items-center gap-2">
                            <span>
                              {michelin} Michelin Star{michelin === '1' ? '' : 's'}
                            </span>
                            <Badge variant="secondary">{count}</Badge>
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Sort & Rating Filter */}
          <div className="flex-shrink-0 w-[60px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-center p-2" aria-label="Open sort and rating filter">
                  <Sliders className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0">
                <div className="p-4">
                  <div className="space-y-6">
                    {/* Sort Options */}
                    <div>
                      <Label className="text-sm font-medium">Sort By</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button
                          variant={sortBy === 'latest' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('latest')}
                          className="justify-start"
                        >
                          Latest
                        </Button>
                        <Button
                          variant={sortBy === 'oldest' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('oldest')}
                          className="justify-start"
                        >
                          Oldest
                        </Button>
                        <Button
                          variant={sortBy === 'rating-high' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('rating-high')}
                          className="justify-start"
                        >
                          Rating ↓
                        </Button>
                        <Button
                          variant={sortBy === 'rating-low' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('rating-low')}
                          className="justify-start"
                        >
                          Rating ↑
                        </Button>
                        <Button
                          variant={sortBy === 'name-az' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('name-az')}
                          className="justify-start"
                        >
                          Name A-Z
                        </Button>
                        <Button
                          variant={sortBy === 'name-za' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('name-za')}
                          className="justify-start"
                        >
                          Name Z-A
                        </Button>
                        <Button
                          variant={sortBy === 'price-low' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('price-low')}
                          className="justify-start"
                        >
                          Price ↑
                        </Button>
                        <Button
                          variant={sortBy === 'price-high' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('price-high')}
                          className="justify-start"
                        >
                          Price ↓
                        </Button>
                        <Button
                          variant={sortBy === 'michelin-high' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('michelin-high')}
                          className="justify-start"
                        >
                          Michelin ↓
                        </Button>
                        <Button
                          variant={sortBy === 'michelin-low' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('michelin-low')}
                          className="justify-start"
                        >
                          Michelin ↑
                        </Button>
                      </div>
                    </div>

                    {/* Rating Range Filter */}
                    <div>
                      <Label className="text-sm font-medium">Rating Range</Label>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{tempRatingRange[0]}</span>
                        <Slider
                          value={tempRatingRange}
                          onValueChange={(value) => setTempRatingRange(value as [number, number])}
                          max={10}
                          min={0}
                          step={0.1}
                          className="flex-1"
                          aria-label="Rating range slider"
                        />
                        <span className="text-sm text-muted-foreground">{tempRatingRange[1]}</span>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button onClick={applyRatingFilter} size="sm">
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full max-w-none py-6 mobile-container px-4 lg:px-6">
      {/* Redesigned Header */}
      {renderDesktopHeader()}

      {/* Mobile toolbar */}
      {renderMobileToolbar()}

      {/* Mobile lists preview */}
      {renderMobileListsPreview()}

      {/* Desktop filters row */}
      {renderDesktopFilters()}

      {/* Content: Loading / Empty / Grid/List */}
      {selectedListId && isListLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading list...</div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">
            {displayRestaurants.length === 0 ? 'No rated restaurants yet' : 'No restaurants found'}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {displayRestaurants.length === 0
              ? "Start adding restaurants you've visited!"
              : 'No restaurants match your search criteria.'}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {displayRestaurants.length === 0 ? 'Add Your First Restaurant' : 'Add Restaurant'}
          </Button>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {filteredRestaurants.map((restaurant) =>
            view === 'grid' ? (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onEdit={handleOpenEditDialog}
                onDelete={handleOpenDeleteDialog}
                showAIReviewAssistant={true}
              />
            ) : (
              <RestaurantCardList
                key={restaurant.id}
                restaurant={restaurant}
                onEdit={handleOpenEditDialog}
                onDelete={handleOpenDeleteDialog}
              />
            )
          )}
        </div>
      )}

      {/* Add Restaurant Dialog
          - defaultSelectedListId: preselects the current page list in the dialog
          - enforceSingleListSelection: if your dialog supports it, this prop enforces radio/single-select
          - onResolveSelectedListId: optional callback (if your dialog supports it) to report which list was chosen
      */}
      <RestaurantDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAdd}
        dialogType="add"
        defaultSelectedListId={selectedListId || undefined}
        // The next two props are optional extensions your dialog can implement.
        // They are ignored by React if the dialog doesn't accept them.
        // @ts-expect-error - optional capabilities of your dialog
        enforceSingleListSelection={true}
        // @ts-expect-error - optional callback
        onResolveSelectedListId={(resolvedListId: string | null) => {
          // keep the page in sync if the dialog internally allowed choosing a different single list
          lastUsedListIdRef.current = resolvedListId;
          if (resolvedListId) {
            setSelectedListId(resolvedListId);
          }
        }}
      />

      {/* Edit dialog */}
      <RestaurantDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        restaurant={selectedRestaurant}
        onSave={handleEdit}
        dialogType="edit"
        // @ts-expect-error - optional capabilities of your dialog
        enforceSingleListSelection={true}
        defaultSelectedListId={selectedListId || undefined}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Restaurant"
        description="Are you sure you want to delete this restaurant? This action cannot be undone."
        confirmText="Delete"
      />

      {/* Mobile filter dialog mirrors the desktop filters */}
      <RatedRestaurantsFilterDialog
        open={showMobileFilters}
        onOpenChange={setShowMobileFilters}
        filterCuisines={filterCuisines}
        filterPrices={filterPrices}
        filterMichelins={filterMichelins}
        ratingRange={ratingRange}
        sortBy={sortBy}
        cuisineCounts={cuisineCounts}
        priceCounts={priceCounts}
        michelinCounts={michelinCounts}
        onCuisineToggle={toggleCuisine}
        onPriceToggle={togglePrice}
        onMichelinToggle={toggleMichelin}
        onRatingRangeChange={setRatingRange}
        onSortByChange={setSortBy}
        onClearFilters={clearFilters}
      />

      {/* Create list dialog → we select the newly created list immediately */}
      <CreateListDialog
        isOpen={isCreateListDialogOpen}
        onClose={() => setIsCreateListDialogOpen(false)}
        onCreateList={handleCreateList}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// End of file
// -----------------------------------------------------------------------------
