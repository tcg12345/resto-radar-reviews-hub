import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import LandingPage from './LandingPage';

export default function Index() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Debug: Log the current authentication state
  console.log('Auth state:', { user: !!user, isLoading, userEmail: user?.email });

  // Redirect authenticated users to the feed page
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/home');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  return user ? null : <LandingPage />;
}
