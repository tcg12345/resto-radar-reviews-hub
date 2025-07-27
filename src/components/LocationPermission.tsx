import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { useLocation } from '@/hooks/useLocation';

interface LocationPermissionProps {
  onLocationGranted?: (location: any) => void;
  onLocationDenied?: () => void;
  showInline?: boolean;
  autoRequest?: boolean;
}

export function LocationPermission({ 
  onLocationGranted, 
  onLocationDenied,
  showInline = false,
  autoRequest = false
}: LocationPermissionProps) {
  const { 
    location, 
    isLoading, 
    error, 
    hasPermission, 
    requestPermission,
    formatLocation 
  } = useLocation();
  
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  React.useEffect(() => {
    if (autoRequest && !hasRequestedPermission && !hasPermission) {
      handleRequestLocation();
    }
  }, [autoRequest, hasRequestedPermission, hasPermission]);

  React.useEffect(() => {
    if (location && onLocationGranted) {
      onLocationGranted(location);
    }
  }, [location, onLocationGranted]);

  React.useEffect(() => {
    if (error && onLocationDenied) {
      onLocationDenied();
    }
  }, [error, onLocationDenied]);

  const handleRequestLocation = async () => {
    setHasRequestedPermission(true);
    await requestPermission();
  };

  if (showInline) {
    return (
      <div className="flex items-center gap-2">
        {!hasPermission && !error && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRequestLocation}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Use Current Location
          </Button>
        )}
        
        {hasPermission && location && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Check className="h-3 w-3" />
            {formatLocation(location)}
          </Badge>
        )}
        
        {error && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <X className="h-3 w-3" />
            Location unavailable
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-lg">Location Access</CardTitle>
        <CardDescription>
          Enable location access to find restaurants and places near you
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!hasPermission && !error && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Find restaurants and attractions nearby</p>
              <p>• Get personalized recommendations</p>
              <p>• Save time with location-based search</p>
            </div>
            
            <Button 
              onClick={handleRequestLocation}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Enable Location Access
                </>
              )}
            </Button>
          </div>
        )}
        
        {hasPermission && location && (
          <div className="space-y-3">
            <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Location Enabled</span>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Current location:</p>
              <p className="font-medium">{formatLocation(location)}</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="space-y-3">
            <div className="flex items-center justify-center p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">Access Denied</span>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                You can manually enter your location in search fields
              </p>
            </div>
            
            <Button 
              variant="outline"
              onClick={handleRequestLocation}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}