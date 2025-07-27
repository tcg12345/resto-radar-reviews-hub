import { Users, UserPlus, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FriendStatsProps {
  totalFriends: number;
  pendingRequests: number;
  sentRequests: number;
  recentActivity: number;
  className?: string;
}

export function FriendStats({ 
  totalFriends, 
  pendingRequests, 
  sentRequests, 
  recentActivity,
  className 
}: FriendStatsProps) {
  const stats = [
    {
      title: 'Friends',
      value: totalFriends,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Total connections'
    },
    {
      title: 'Pending',
      value: pendingRequests,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Awaiting response'
    },
    {
      title: 'Sent',
      value: sentRequests,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Requests sent'
    },
    {
      title: 'Active',
      value: recentActivity,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Recent activity'
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => (
        <Card 
          key={index} 
          className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-background to-muted/30"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground">{stat.title}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}