import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
interface SaveItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string) => void;
  currentTitle: string;
}
export function SaveItineraryDialog({
  isOpen,
  onClose,
  onSave,
  currentTitle
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
  return <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Itinerary
          </DialogTitle>
          <DialogDescription>
            Give your itinerary a memorable name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Itinerary Name</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter itinerary name..." className="w-full" onKeyPress={e => e.key === 'Enter' && handleSave()} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="my-[7px]">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Itinerary
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}