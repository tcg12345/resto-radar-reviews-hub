import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Trash2, Edit, Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RestaurantList } from '@/hooks/useRestaurantLists';

interface RestaurantListCardProps {
  list: RestaurantList;
  onSelect: (list: RestaurantList) => void;
  onEdit?: (list: RestaurantList) => void;
  onDelete?: (listId: string) => void;
}

export function RestaurantListCard({ 
  list, 
  onSelect, 
  onEdit, 
  onDelete 
}: RestaurantListCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card/95 to-card border-0 shadow-md hover:scale-[1.02] group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onSelect(list)}
          >
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl font-semibold truncate group-hover:text-primary transition-colors">
                {list.name}
              </CardTitle>
              {list.is_default && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
                  <Star className="h-3 w-3" />
                  Default
                </Badge>
              )}
            </div>
            {list.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {list.description}
              </p>
            )}
          </div>

          {!list.is_default && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(list)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit List
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(list.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete List
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div 
          className="cursor-pointer"
          onClick={() => onSelect(list)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">
                {list.restaurant_count || 0}
              </span>
              <span className="text-sm text-muted-foreground">
                restaurant{(list.restaurant_count || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(list.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}