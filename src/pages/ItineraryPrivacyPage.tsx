import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ItineraryPrivacySettings } from '@/components/ItineraryPrivacySettings';

export function ItineraryPrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px]" style={{ backgroundColor: 'rgb(24,24,26)' }}></div>
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Itinerary Privacy</h1>
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        <ItineraryPrivacySettings />
      </div>
    </div>
  );
}