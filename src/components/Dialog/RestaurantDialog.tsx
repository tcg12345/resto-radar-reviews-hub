import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RestaurantForm } from "@/components/RestaurantForm";
import { Restaurant, RestaurantFormData } from "@/types/restaurant";

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
  const handleSave = (data: RestaurantFormData) => {
    onSave(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

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