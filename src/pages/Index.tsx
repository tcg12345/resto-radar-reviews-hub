import { useAuth } from '@/contexts/AuthContext';
import { RestaurantProvider } from '@/contexts/RestaurantContext';
import LandingPage from './LandingPage';
import Dashboard from './Dashboard';

export default function Index() {
  const { user, isLoading } = useAuth();

  // Debug: Log the current authentication state
  console.log('Auth state:', { user: !!user, isLoading, userEmail: user?.email });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show dashboard if user is authenticated, otherwise show landing page
  return user ? (
    <RestaurantProvider>
      <Dashboard />
    </RestaurantProvider>
  ) : (
    <LandingPage />
  );
}
