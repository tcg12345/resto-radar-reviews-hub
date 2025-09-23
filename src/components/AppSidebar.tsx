import { useState } from 'react';
import { Calendar, Settings, MessageCircle, Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount';

interface AppSidebarProps {
  onNavigate?: (path: string) => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const unreadMessageCount = useUnreadMessageCount();

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsOpen(false);
    onNavigate?.(path);
  };

  const menuItems = [
    {
      label: 'Travel',
      icon: Calendar,
      path: '/travel',
      description: 'Plan trips and manage itineraries'
    },
    {
      label: 'Messages',
      icon: MessageCircle,
      path: '/chat-list',
      description: 'View your conversations',
      badge: unreadMessageCount > 0 ? (unreadMessageCount > 9 ? '9+' : unreadMessageCount.toString()) : undefined
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/settings',
      description: 'Manage your account and preferences'
    }
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className="h-12 w-12"
          title="Menu"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className="w-full justify-start h-auto p-4 text-left"
                onClick={() => handleNavigation(item.path)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    {item.badge && (
                      <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                </div>
              </Button>
            );
          })}
          
          {/* Notifications section */}
          <div className="pt-4 border-t">
            <div className="mb-2 text-sm font-medium text-muted-foreground">Notifications</div>
            <div className="flex justify-center">
              <NotificationsPanel />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}