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
import { Drawer, DrawerContent } from "@/components/ui/drawer";
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
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="w-full">
            <div className="sticky top-0 z-10 bg-gradient-to-b from-background/95 via-background to-background/80 backdrop-blur-sm border-b border-border/50 px-5 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <DialogTitle className="text-base font-semibold">
                    {dialogType === "add" ? "Add Restaurant" : "Edit Restaurant"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {dialogType === "add"
                      ? "Quickly add a place to your list"
                      : "Make a quick update"}
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
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <RestaurantForm
                initialData={restaurant}
                onSubmit={handleSave}
                onCancel={handleCancel}
                defaultWishlist={defaultWishlist}
                hideSearch={hideSearch}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
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