import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Menu, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTripAdvisorApi } from '@/hooks/useTripAdvisorApi';

interface MenuButtonProps {
  restaurantName: string;
  restaurantAddress?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function MenuButton({ restaurantName, restaurantAddress, className, size = 'sm' }: MenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuData, setMenuData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { searchLocations, getLocationMenu } = useTripAdvisorApi();

  const handleMenuClick = async () => {
    setIsLoading(true);
    setIsOpen(true);

    try {
      // First search for the restaurant on TripAdvisor
      const searchQuery = `${restaurantName} ${restaurantAddress || ''}`.trim();
      const locations = await searchLocations(searchQuery);
      
      if (locations.length > 0) {
        const location = locations[0];
        console.log('Found location:', location);
        
        try {
          // Try to get menu data
          const menu = await getLocationMenu(location.location_id);
          console.log('Menu data:', menu);
          setMenuData(menu);
        } catch (error) {
          console.error('Error fetching menu:', error);
          // If TripAdvisor menu API fails, provide fallback
          setMenuData({
            web_url: `https://www.google.com/search?q=${encodeURIComponent(`${restaurantName} menu`)}`,
            fallback: true
          });
        }
      } else {
        // No TripAdvisor location found, provide Google search fallback
        setMenuData({
          web_url: `https://www.google.com/search?q=${encodeURIComponent(`${restaurantName} menu`)}`,
          fallback: true
        });
      }
    } catch (error) {
      console.error('Error searching restaurant:', error);
      toast.error('Could not load menu');
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMenuLinkClick = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <>
      <Button
        size={size}
        variant="outline"
        onClick={handleMenuClick}
        className={className}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Menu className="h-3 w-3 mr-1" />
        )}
        Menu
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Menu for {restaurantName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading menu...</span>
              </div>
            ) : menuData ? (
              <div className="space-y-4">
                {menuData.web_url && (
                  <Button
                    onClick={() => handleMenuLinkClick(menuData.web_url)}
                    className="w-full"
                    variant={menuData.fallback ? "outline" : "default"}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {menuData.fallback ? 'Search for Menu Online' : 'View Menu on TripAdvisor'}
                  </Button>
                )}
                
                {menuData.pdf_url && (
                  <Button
                    onClick={() => handleMenuLinkClick(menuData.pdf_url)}
                    className="w-full"
                    variant="outline"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Download Menu PDF
                  </Button>
                )}

                {menuData.sections && menuData.sections.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold">Menu Sections</h3>
                    {menuData.sections.map((section: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{section.section_name}</h4>
                        <div className="space-y-2">
                          {section.items?.map((item: any, itemIndex: number) => (
                            <div key={itemIndex} className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-sm">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground">{item.description}</div>
                                )}
                              </div>
                              {item.price && (
                                <div className="text-sm font-medium">{item.price}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {menuData.fallback && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Menu details not available on TripAdvisor. Click above to search for the menu online.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No menu data available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}