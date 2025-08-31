import { SavedItinerariesSection } from '@/components/SavedItinerariesSection';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SavedItinerariesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="h-10 w-10 p-0 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Saved Itineraries</h1>
        </div>
        
        <SavedItinerariesSection 
          onLoadItinerary={(itinerary) => {
            // Navigate back to travel page and load the itinerary
            navigate('/travel', { state: { loadItinerary: itinerary } });
          }} 
        />
      </div>
    </div>
  );
}