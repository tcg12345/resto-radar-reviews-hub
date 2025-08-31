import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RestaurantForm } from '@/components/RestaurantForm';
import { RestaurantFormData } from '@/types/restaurant';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RestaurantFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addRestaurant } = useRestaurants();
  const [prefilledData, setPrefilledData] = useState<any>(null);

  useEffect(() => {
    const prefillParam = searchParams.get('prefill');
    if (prefillParam) {
      try {
        const rawData = JSON.parse(decodeURIComponent(prefillParam));
        
        // Map the prefilled data to match RestaurantFormData format
        const mappedData = {
          name: rawData.name || '',
          address: rawData.address || '',
          city: rawData.city || '',
          country: rawData.country || '',
          cuisine: rawData.cuisine || '',
          priceRange: rawData.price_range || rawData.priceRange,
          michelinStars: rawData.michelin_stars || rawData.michelinStars,
          photos: [], // Start with empty photos for new entry
          latitude: rawData.latitude,
          longitude: rawData.longitude,
          website: rawData.website || '',
          phone_number: rawData.phone_number || '',
          opening_hours: rawData.opening_hours || rawData.openingHours || '',
          reservable: rawData.reservable || false,
          reservation_url: rawData.reservation_url || rawData.reservationUrl || '',
          google_place_id: rawData.google_place_id || rawData.place_id,
          isWishlist: false, // This should be false for rated restaurants
          notes: '',
          dateVisited: '',
          categoryRatings: undefined,
          useWeightedRating: false
        };
        
        setPrefilledData(mappedData);
      } catch (error) {
        console.error('Error parsing prefilled data:', error);
        toast.error('Error loading restaurant data');
      }
    }
  }, [searchParams]);

  const handleSubmit = async (data: RestaurantFormData) => {
    try {
      await addRestaurant(data);
      toast.success('Restaurant added successfully!');
      navigate('/rated');
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant');
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Rate & Review Restaurant</h1>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container max-w-2xl mx-auto p-4">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Add your rating and review for this restaurant. Basic information has been pre-filled.
          </p>
        </div>

        <RestaurantForm
          initialData={prefilledData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          defaultWishlist={false}
          hideSearch={true}
        />
      </div>
    </div>
  );
}