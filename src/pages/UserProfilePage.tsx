import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to friends page since we're using local state for profiles
    navigate('/friends', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-muted-foreground">Redirecting to friends page...</p>
    </div>
  );
}