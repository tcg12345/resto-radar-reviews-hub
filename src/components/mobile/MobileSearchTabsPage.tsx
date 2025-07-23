import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MobileUnifiedSearchPage } from './MobileUnifiedSearchPage';
import { MobileFriendsActivityPage } from './MobileFriendsActivityPage';

type SearchTab = 'global' | 'friends';

export function MobileSearchTabsPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<SearchTab>('global');

  useEffect(() => {
    if (tab) {
      setActiveTab(tab as SearchTab);
    } else if (window.location.pathname === '/friends-activity') {
      setActiveTab('friends');
    }
  }, [tab]);

  const handleTabChange = (value: string) => {
    const newTab = value as SearchTab;
    setActiveTab(newTab);
    
    if (newTab === 'friends') {
      if (window.location.pathname === '/friends-activity') {
        return;
      }
    }
    
    navigate(`/search/${newTab}`);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Header */}
      <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <h1 className="text-lg font-bold mb-3 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Search
        </h1>
        
        {/* Compact Tab Buttons */}
        <div className="flex bg-muted/50 rounded-xl p-1">
          <button
            onClick={() => handleTabChange('global')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'global'
                ? 'bg-background text-primary shadow-sm border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Restaurants
          </button>
          <button
            onClick={() => handleTabChange('friends')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'friends'
                ? 'bg-background text-primary shadow-sm border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Friends
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'global' && <MobileUnifiedSearchPage />}
        {activeTab === 'friends' && <MobileFriendsActivityPage />}
      </div>
    </div>
  );
}