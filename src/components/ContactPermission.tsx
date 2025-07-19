import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ContactPermissionProps {
  onPermissionGranted: (contacts: any[]) => void;
  onPermissionDenied: () => void;
}

export function ContactPermission({ onPermissionGranted, onPermissionDenied }: ContactPermissionProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestContactAccess = async () => {
    setIsRequesting(true);
    
    try {
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        toast.error('Contact access requires HTTPS. This feature will work when deployed.');
        onPermissionDenied();
        return;
      }

      // Check if navigator.contacts is available (Chrome/Edge only currently)
      if ('contacts' in navigator && 'ContactsManager' in window) {
        try {
          const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
          onPermissionGranted(contacts);
          toast.success('Contact access granted!');
        } catch (error) {
          console.log('Contact access denied or cancelled:', error);
          onPermissionDenied();
        }
      } else {
        // Fallback: Show manual phone number input
        toast.info('Contact API not available. You can still search by username or enter phone numbers manually.');
        onPermissionDenied();
      }
    } catch (error) {
      console.error('Error requesting contact access:', error);
      toast.error('Unable to access contacts');
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="p-6 text-center space-y-4">
      <h3 className="text-lg font-semibold">Find Friends from Contacts</h3>
      <p className="text-muted-foreground">
        Allow access to your contacts to find friends who are already using the app.
      </p>
      <div className="flex gap-2 justify-center">
        <Button
          onClick={requestContactAccess}
          disabled={isRequesting}
          className="flex items-center gap-2"
        >
          {isRequesting ? 'Requesting...' : 'Allow Contact Access'}
        </Button>
        <Button
          variant="outline"
          onClick={onPermissionDenied}
        >
          Skip
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Contact access requires HTTPS and is currently supported in Chrome/Edge browsers.
      </p>
    </div>
  );
}