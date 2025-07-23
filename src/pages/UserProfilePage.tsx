import { useParams } from 'react-router-dom';
import FriendProfilePage from './FriendProfilePage';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return <FriendProfilePage />;
}