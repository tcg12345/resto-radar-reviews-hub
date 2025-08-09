import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RestaurantForm } from "@/components/RestaurantForm";
import { Restaurant, RestaurantFormData } from "@/types/restaurant";
import { useIsMobile } from "@/hooks/useIsMobile";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RestaurantDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant?: Restaurant;
  onSave: (data: RestaurantFormData) => void;
  dialogType: "add" | "edit";
  defaultWishlist?: boolean;
  hideSearch?: boolean;
}

export function RestaurantDialog({
  isOpen,
  onOpenChange,
  restaurant,
  onSave,
  dialogType,
  defaultWishlist = false,
  hideSearch = false,
}: RestaurantDialogProps) {
  const isMobile = useIsMobile();
  
  const handleSave = (data: RestaurantFormData) => {
    onSave(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="fixed inset-x-0 bottom-0 top-16 rounded-t-3xl border-t bg-background/95 backdrop-blur-md p-0 shadow-2xl animate-slide-in-right data-[state=closed]:animate-slide-out-right overflow-hidden">
          {/* Modern Mobile Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background/95 to-background/80 backdrop-blur-sm border-b border-border/50">
            <div className="flex items-center justify-between p-6 pb-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-semibold text-foreground">
                  {dialogType === "add" ? "Add Restaurant" : "Edit Restaurant"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {dialogType === "add"
                    ? "Add a new place to your collection"
                    : "Update restaurant details"}
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Subtle divider line */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 pt-4 pb-8">
              <RestaurantForm
                initialData={restaurant}
                onSubmit={handleSave}
                onCancel={handleCancel}
                defaultWishlist={defaultWishlist}
                hideSearch={hideSearch}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop version (existing style)
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {dialogType === "add" ? "Add New Restaurant" : "Edit Restaurant"}
          </DialogTitle>
          <DialogDescription>
            {dialogType === "add"
              ? "Add a new restaurant to your collection."
              : "Update the details of this restaurant."}
          </DialogDescription>
        </DialogHeader>
        <RestaurantForm
          initialData={restaurant}
          onSubmit={handleSave}
          onCancel={handleCancel}
          defaultWishlist={defaultWishlist}
          hideSearch={hideSearch}
        />
      </DialogContent>
    </Dialog>
  );
}