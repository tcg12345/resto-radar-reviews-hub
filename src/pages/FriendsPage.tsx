import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Search, Heart } from 'lucide-react';

export function FriendsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Friends</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Find Friends</span>
            </CardTitle>
            <CardDescription>
              Search for friends by username
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming soon! You'll be able to search for other users and send friend requests.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Your Friends</span>
            </CardTitle>
            <CardDescription>
              See your connected friends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your friends will appear here once you've connected with other users.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Friend Requests</span>
            </CardTitle>
            <CardDescription>
              Manage incoming requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Friend requests from other users will appear here for you to accept or decline.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Friends Features</CardTitle>
          <CardDescription>
            What you'll be able to do with friends
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-3">
            <Heart className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium">View Friends' Restaurants</h4>
              <p className="text-sm text-muted-foreground">
                See restaurants your friends have rated and reviewed
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="font-medium">Privacy Controls</h4>
              <p className="text-sm text-muted-foreground">
                Choose to make your account public or private
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Search className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium">User Scores</h4>
              <p className="text-sm text-muted-foreground">
                See how many restaurants your friends have rated
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}