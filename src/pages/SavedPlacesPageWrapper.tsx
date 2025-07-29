import { SavedPlacesPage } from '@/pages/SavedPlacesPage';
import { useNavigate } from 'react-router-dom';

export default function SavedPlacesPageWrapper() {
  const navigate = useNavigate();

  return (
    <SavedPlacesPage 
      onNavigateToMap={() => navigate('/map')}
      onOpenSettings={() => navigate('/settings')}
    />
  );
}