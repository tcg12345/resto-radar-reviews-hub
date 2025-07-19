import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

interface ContactPermissionProps {
  onPermissionGranted: (contacts: any[]) => void;
  onPermissionDenied: () => void;
}

export function ContactPermission({ onPermissionGranted, onPermissionDenied }: ContactPermissionProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestContactAccess = async () => {
    setIsRequesting(true);
    
    try {
      // Check if we're running on mobile via Capacitor
      if (Capacitor.isNativePlatform()) {
        try {
          // Dynamic import for Capacitor Contacts plugin
          const { Contacts } = await import('@capacitor-community/contacts');
          
          // Request permission and get contacts
          const permission = await Contacts.requestPermissions();
          
          if (permission.contacts === 'granted') {
            const result = await Contacts.getContacts({
              projection: {
                name: true,
                phones: true,
              }
            });
            
            // Format contacts for our use
            const formattedContacts = result.contacts.map(contact => ({
              name: contact.name?.display || 'Unknown',
              tel: contact.phones?.[0]?.number || ''
            })).filter(contact => contact.tel);
            
            onPermissionGranted(formattedContacts);
            toast.success(`Found ${formattedContacts.length} contacts!`);
          } else {
            toast.error('Contact permission denied');
            onPermissionDenied();
          }
        } catch (error) {
          console.error('Capacitor contacts error:', error);
          toast.error('Unable to access contacts on mobile');
          onPermissionDenied();
        }
      } else {
        // Web browser - use Contact Picker API
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
            toast.success(`Found ${contacts.length} contacts!`);
          } catch (error) {
            console.log('Contact access denied or cancelled:', error);
            onPermissionDenied();
          }
        } else {
          // Fallback: Show helpful message
          toast.info('Contact API not available in this browser. Try using Chrome/Edge or the mobile app for full contact access.');
          onPermissionDenied();
        }
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