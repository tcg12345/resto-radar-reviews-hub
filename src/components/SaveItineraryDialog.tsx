import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useIsMobile';
interface SaveItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  currentTitle: string;
  isUpdate?: boolean;
}
export function SaveItineraryDialog({
  isOpen,
  onClose,
  onSave,
  currentTitle,
  isUpdate = false
}: SaveItineraryDialogProps) {
  const [title, setTitle] = useState('');
  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
    }
  }, [isOpen, currentTitle]);
  const handleSave = () => {
    if (title.trim()) {
      onSave(title.trim());
      onClose();
    }
  };
  const handleClose = () => {
    setTitle('');
    onClose();
  };
  const isMobile = useIsMobile();
  const snapPoints = [0.5, 0.92, 1];
  const [activeSnap, setActiveSnap] = useState<number | string>(snapPoints[0]);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose} snapPoints={snapPoints} activeSnapPoint={activeSnap} onSnapPointChange={setActiveSnap}>
        <DrawerContent className="rounded-t-3xl border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="mx-auto w-full max-w-md">
            <div className="sticky top-0 z-10 border-b border-border/50 bg-gradient-to-b from-background/95 via-background to-background/80 px-5 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <DrawerTitle className="text-base font-semibold">{isUpdate ? 'Update Itinerary' : 'Save Itinerary'}</DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">{isUpdate ? 'Update your itinerary name' : 'Give your itinerary a memorable name'}</DrawerDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Itinerary Name</Label>
                  <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter itinerary name..." className="w-full" onKeyPress={e => e.key === 'Enter' && handleSave()} />
                </div>
              </div>
            </div>

            <DrawerFooter>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                <Button onClick={handleSave} disabled={!title.trim()} className="flex-1 flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {isUpdate ? 'Update Itinerary' : 'Save Itinerary'}
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            {isUpdate ? 'Update Itinerary' : 'Save Itinerary'}
          </DialogTitle>
          <DialogDescription>
            {isUpdate ? 'Update your itinerary name' : 'Give your itinerary a memorable name'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Itinerary Name</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter itinerary name..." className="w-full" onKeyPress={e => e.key === 'Enter' && handleSave()} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="my-[7px]">Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isUpdate ? 'Update Itinerary' : 'Save Itinerary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}