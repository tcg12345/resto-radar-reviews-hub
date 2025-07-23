import { useAuth } from '@/contexts/AuthContext';
import { RestaurantProvider } from '@/contexts/RestaurantContext';
import { Layout } from '@/components/Layout';
import LandingPage from './LandingPage';
import HomePageWrapper from './HomePageWrapper';

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

  // Show home page if user is authenticated, otherwise show landing page
  return user ? (
    <RestaurantProvider>
      <Layout activeTab="home">
        <HomePageWrapper />
      </Layout>
    </RestaurantProvider>
  ) : (
    <LandingPage />
  );
}
