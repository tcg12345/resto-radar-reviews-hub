import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
} from '@/components/ui/bottom-sheet';
import ActivityRecommendations from '@/components/ActivityRecommendations';

interface ActivityRecommendationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  latitude?: number;
  longitude?: number;
  city?: string;
}

export default function ActivityRecommendationsDialog({
  isOpen,
  onClose,
  latitude,
  longitude,
  city,
}: ActivityRecommendationsDialogProps) {
  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(open) => {
        // IMPORTANT: the handler receives a boolean
        if (!open) onClose();
      }}
    >
      <BottomSheetContent
        // Ensure the sheet is visible above the overlay and screen edge
        className="fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl bg-white px-4 py-6
                   min-h-[40vh] max-h-[90vh] shadow-xl"
      >
        <BottomSheetHeader className="px-1">
          <h2 className="text-xl font-semibold text-center">
            Discover Activities in {city || 'Your Destination'}
          </h2>
        </BottomSheetHeader>

        {/* Put your content here */}
        <div className="mt-4">
          <ActivityRecommendations
            latitude={latitude}
            longitude={longitude}
            city={city}
          />
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}